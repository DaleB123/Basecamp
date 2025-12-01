from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional
import os

# ============================================================================
# PYDANTIC MODELS - Define request/response schemas for API validation
# ============================================================================

# Model for user signup with all required profile information
class UserCredentials(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    password: str

# Model for user login with username and password
class LoginCredentials(BaseModel):
    username: str
    password: str

# Model for individual packing list items with ownership and sharing info
class PackingItem(BaseModel):
    id: str
    text: str
    is_checked: bool
    category: str
    is_shared: bool
    owner_id: str

# Model for chat messages in trip conversations
class ChatMessage(BaseModel):
    id: str
    sender_id: str
    sender_username: str
    text: str
    timestamp: str

    class Config:
        extra = "ignore"  # Ignore any extra fields not defined in the model

# Model for trip/calendar creation and updates
class Trip(BaseModel):
    owner: str
    name: str
    start: str
    end: str
    description: str
    members: list
    packing_list: List[PackingItem] = []

# Model for profile updates (includes old_username for identification)
class Profile(BaseModel):
    old_username: str
    username: str
    email: str
    first_name: str
    last_name: str
    date_created: str

# Model for itinerary events with cost splitting functionality
class Event(BaseModel):
    trip_id: str
    creator: str
    title: str
    start: str
    end: str
    type: str
    location: str
    cost: float
    cost_assignments: dict = {}  # Maps user_id -> boolean (who the cost is assigned to)
    details: str
    votes: list = []  # List of user_ids who voted for this event (for conflict resolution)
    payments: dict = {}  # Maps user_id -> boolean (payment status: paid/unpaid)

# Model for password change requests
class PasswordUpdate(BaseModel):
    username: str
    currentPassword: str
    newPassword: str

# Model for trip invitations sent to other users
class Invitation(BaseModel):
    trip_id: str
    inviter_id: str
    invitee_username: str

# ============================================================================
# APPLICATION SETUP
# ============================================================================

app = FastAPI()

# MongoDB connection and database/collection references
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://TripSync:1a2qYb9vOavPeMtw@tripsync.kl0if1g.mongodb.net/")
client = MongoClient(MONGO_URI)
logins = client["Logins"]
users = logins["Accounts"]  # User account information
trips = client["Trips"]
calendars = trips["Calendars"]  # Trip/calendar data
events = trips["Events"]  # Itinerary events
invitations = trips["Invitations"]  # Pending trip invitations
messages_collection = trips["Messages"]  # Trip chat messages

# Enable CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

# ============================================================================
# BASIC ENDPOINTS
# ============================================================================

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI + MongoDB"}

# ============================================================================
# USER PROFILE ENDPOINTS
# ============================================================================

@app.get("/profiles/{username}")
async def get_profile(username: str):
    """Get user profile by username"""
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    
    user = users.find_one({"username": username})
    
    if user:
        user["_id"] = str(user["_id"])  # Convert ObjectId to string for JSON serialization
        return {"success": True, "profile": user}
    
    return {"success": False, "message": "User not found."}

@app.post("/profiles")
async def update_profile(profile: Profile):
    """Update user profile information"""
    old_username = profile.old_username
    username = profile.username
    email = profile.email
    first_name = profile.first_name
    last_name = profile.last_name

    if not username:
        return {"success": False, "message": "Username is required."}
    
    # Ensure new username isn't already taken by another user
    if users.find_one({"username": username}) and username != old_username:
        return {"success": False, "message": "Username already exists."}
    
    # Ensure new email isn't already in use by another user
    if email != "" and users.find_one({"email": email, "username": {"$ne": old_username}}):
        return {"success": False, "message": "Email already in use."}

    # Update the user's profile in the database
    result = users.update_one(
        {"username": old_username},
        {"$set": {
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name
        }}
    )
    
    if result.matched_count == 0:
        return {"success": False, "message": "User not found."}
    
    return {"success": True, "message": "Profile updated successfully."}

@app.get("/profiles/id/{user_id}")
async def get_profile_by_id(user_id: str):
    """Get user profile by MongoDB ObjectId (used for fetching trip members)"""
    from bson import ObjectId
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        
        if user:
            user["_id"] = str(user["_id"])
            return {"success": True, "profile": user}
        
        return {"success": False, "message": "User not found."}
    except:
        return {"success": False, "message": "Invalid user ID."}

@app.post("/profiles/password")
async def update_password(password_data: PasswordUpdate):
    """Update user password with current password verification"""
    username = password_data.username
    current_password = password_data.currentPassword
    new_password = password_data.newPassword

    user = users.find_one({"username": username})

    if not user:
        return {"success": False, "message": "User not found"}

    # Verify current password before allowing change
    if user["password"] != current_password:
        return {"success": False, "message": "Current password is incorrect"}

    # Update the password
    result = users.update_one(
        {"username": username},
        {"$set": {"password": new_password}}
    )

    if result.modified_count == 1:
        return {"success": True, "message": "Password updated successfully"}
    return {"success": False, "message": "Failed to update password"}

@app.delete("/profiles/{username}")
async def delete_user(username: str):
    """Delete a user account"""
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    
    result = users.delete_one({"username": username})
    
    if result.deleted_count == 1:
        return {"success": True, "message": "User deleted successfully"}
    return {"success": False, "message": "User not found"}

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/login")
async def login(credentials: LoginCredentials):
    """Authenticate user and return user ID on success"""
    username = credentials.username
    password = credentials.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    user = users.find_one({"username": username})

    # Verify credentials and return user ID for session management
    if user and user["password"] == password:
        return {"success": True, "message": "Login successful!", "id": str(user["_id"])}
    
    return {"success": False, "message": "Invalid username or password."}

@app.post("/signup")
async def signup(credentials: UserCredentials):
    """Create a new user account"""
    first_name = credentials.first_name
    last_name = credentials.last_name
    username = credentials.username
    password = credentials.password
    email = credentials.email
    date_created = date.today()

    if not username or not password:
        return {"success": False, "message": "Username and password are required."}

    # Ensure username is unique
    if users.find_one({"username": username}):
        return {"success": False, "message": "Username already exists."}
    
    # Ensure email is unique
    if users.find_one({"email": email}):
        return {"success": False, "message": "Email already exists."}

    # Insert new user
    result = users.insert_one({
        "username": username,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "date_created": str(date_created)
    })

    return {"success": True, "message": "Signup successful!", "id": str(result.inserted_id)}

# ============================================================================
# TRIP/CALENDAR ENDPOINTS
# ============================================================================

@app.get("/calendars/users/{id}")
async def get_calendars(id: str):
    """Get all trips where user is owner or member"""
    # Find all trips the user owns or is a member of
    user_calendars = list(calendars.find({
        "$or": [
            {"owner": id},
            {"members": id}
        ]
    }))
    
    # Convert ObjectId to string for JSON serialization
    for calendar in user_calendars:
        calendar["_id"] = str(calendar["_id"])
    
    if user_calendars:
        return {"success": True, "calendars": user_calendars}
    
    return {"success": False, "calendars": []}

@app.get("/calendars/{id}")
async def get_calendar(id: str):
    """Get a single trip by ID (includes packing list)"""
    from bson import ObjectId
    try:
        calendar = calendars.find_one({"_id": ObjectId(id)})
        if calendar:
            calendar["_id"] = str(calendar["_id"])
            return {"success": True, "calendar": calendar}
        return {"success": False, "message": "Calendar not found"}
    except:
        return {"success": False, "message": "Invalid ID"}

@app.post("/calendars")
async def create_calendar(trip: Trip):
    """Create a new trip/calendar"""
    # Build trip document with all fields including empty packing list
    new_trip = {
        "owner": trip.owner,
        "name": trip.name,
        "start": trip.start,
        "end": trip.end,
        "description": trip.description,
        "members": trip.members,
        "packing_list": [item.dict() for item in trip.packing_list]
    }
    
    result = calendars.insert_one(new_trip)
    
    # Return the newly created trip with its generated ID
    created_trip = calendars.find_one({"_id": result.inserted_id})
    created_trip["_id"] = str(created_trip["_id"])
    
    return {"success": True, "calendar": created_trip}

@app.put("/calendars/{id}")
async def update_calendar(id: str, trip: Trip):
    """Update trip details (name, dates, description, members, packing list)"""
    from bson import ObjectId
    update_data = {
        "owner": trip.owner,
        "name": trip.name,
        "start": trip.start,
        "end": trip.end,
        "description": trip.description,
        "members": trip.members,
        "packing_list": [item.dict() for item in trip.packing_list]  # Convert Pydantic models to dicts
    }
    result = calendars.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_trip = calendars.find_one({"_id": ObjectId(id)})
        updated_trip["_id"] = str(updated_trip["_id"])
        return {"success": True, "calendar": updated_trip}
    return {"success": False, "message": "Calendar not found."}

@app.post("/calendars/{id}/messages")
async def add_message(id: str, message: ChatMessage):
    """Add a message to trip chat"""
    print(f"Adding message to trip {id}: {message}")
    msg_data = message.dict()
    msg_data["trip_id"] = id  # Associate message with trip
    messages_collection.insert_one(msg_data)
    return {"success": True, "message": "Message added successfully"}

@app.get("/calendars/{id}/messages")
async def get_messages(id: str):
    """Get all chat messages for a trip"""
    print(f"Getting messages for trip {id}")
    trip_messages = list(messages_collection.find({"trip_id": id}))
    for msg in trip_messages:
        msg["_id"] = str(msg["_id"])
    return {"success": True, "messages": trip_messages}

@app.delete("/calendars/{id}")
async def delete_calendar(id: str):
    """Delete a trip and all associated data (events, invitations)"""
    from bson import ObjectId
    result = calendars.delete_one({"_id": ObjectId(id)})

    # Delete all events associated with this trip
    trip_events = list(events.find({"trip_id": id}))
    for event in trip_events:
        events.delete_one({"_id": ObjectId(event["_id"])})
    
    # Delete any pending invitations for this trip
    invitations.delete_many({"trip_id": id})

    if result.deleted_count == 1:
        return {"success": True, "message": "Trip deleted successfully."}
    return {"success": False, "message": "Trip not found."}

# ============================================================================
# EVENT/ITINERARY ENDPOINTS
# ============================================================================

@app.post("/events")
async def create_event(event: Event):
    """Create a new itinerary event with cost splitting"""
    new_event = {
        "trip_id": event.trip_id,
        "creator": event.creator,
        "title": event.title,
        "start": event.start,
        "end": event.end,
        "type": event.type,
        "location": event.location,
        "cost": event.cost,
        "cost_assignments": event.cost_assignments,  # Who the cost is split between
        "details": event.details,
        "votes": event.votes,  # For conflict resolution voting
        "payments": event.payments  # Payment status tracking
    }
    result = events.insert_one(new_event)

    created_event = events.find_one({"_id": result.inserted_id})
    created_event["_id"] = str(created_event["_id"])
    return {"success": True, "event": created_event}

@app.get("/events/trip/{trip_id}")
async def get_events(trip_id: str):
    """Get all events for a specific trip"""
    # Find all events associated with the trip
    trip_events = list(events.find({"trip_id": trip_id}))
    
    # Convert ObjectId to string for JSON serialization
    for event in trip_events:
        event["_id"] = str(event["_id"])
    
    if trip_events:
        return {"success": True, "events": trip_events}
    
    return {"success": False, "message": "No events found for this trip."}

@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete an event from the itinerary"""
    from bson import ObjectId
    result = events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 1:
        return {"success": True, "message": "Event deleted successfully."}
    return {"success": False, "message": "Event not found."}

@app.put("/events/{event_id}")
async def update_event(event_id: str, event: Event):
    """Update event details, votes, cost assignments, or payment status"""
    from bson import ObjectId
    update_data = {
        "trip_id": event.trip_id,
        "creator": event.creator,
        "title": event.title,
        "start": event.start,
        "end": event.end,
        "type": event.type,
        "location": event.location,
        "cost": event.cost,
        "cost_assignments": event.cost_assignments,  # Updated cost splitting
        "details": event.details,
        "votes": event.votes,  # Updated votes for conflict resolution
        "payments": event.payments  # Updated payment status
    }
    result = events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_event = events.find_one({"_id": ObjectId(event_id)})
        updated_event["_id"] = str(updated_event["_id"])
        return {"success": True, "event": updated_event}
    return {"success": False, "message": "Event not found."}

# ============================================================================
# INVITATION ENDPOINTS - Trip member invitation system
# ============================================================================

@app.post("/invitations")
async def create_invitation(invitation: Invitation):
    """Send a trip invitation to another user"""
    # Verify invitee exists
    invitee = users.find_one({"username": invitation.invitee_username})
    if not invitee:
        return {"success": False, "message": "User not found."}
    
    invitee_id = str(invitee["_id"])
    
    # Prevent duplicate invitations
    existing = invitations.find_one({
        "trip_id": invitation.trip_id,
        "invitee_id": invitee_id
    })
    if existing:
        return {"success": False, "message": "Invitation already sent."}
    
    # Don't allow inviting existing members
    from bson import ObjectId
    trip = calendars.find_one({"_id": ObjectId(invitation.trip_id)})
    if trip and invitee_id in trip.get("members", []):
        return {"success": False, "message": "User is already a member of this trip."}
    
    # Create the invitation with timestamp
    new_invitation = {
        "trip_id": invitation.trip_id,
        "inviter_id": invitation.inviter_id,
        "invitee_id": invitee_id,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = invitations.insert_one(new_invitation)
    created_invitation = invitations.find_one({"_id": result.inserted_id})
    created_invitation["_id"] = str(created_invitation["_id"])
    
    return {"success": True, "invitation": created_invitation}

@app.get("/invitations/{user_id}")
async def get_invitations(user_id: str):
    """Get all pending invitations for a user with trip and inviter details"""
    # Find all invitations for this user
    user_invitations = list(invitations.find({
        "invitee_id": user_id
    }))
    
    from bson import ObjectId
    # Enrich invitations with trip name/dates and inviter username
    enriched_invitations = []
    for inv in user_invitations:
        trip = calendars.find_one({"_id": ObjectId(inv["trip_id"])})
        inviter = users.find_one({"_id": ObjectId(inv["inviter_id"])})
        
        if trip and inviter:
            inv["_id"] = str(inv["_id"])
            inv["trip_name"] = trip["name"]
            inv["trip_start"] = trip["start"]
            inv["trip_end"] = trip["end"]
            inv["inviter_username"] = inviter["username"]
            enriched_invitations.append(inv)
    
    return {"success": True, "invitations": enriched_invitations}

@app.post("/invitations/{invitation_id}/accept")
async def accept_invitation(invitation_id: str):
    """Accept a trip invitation and add user to trip members"""
    from bson import ObjectId
    
    invitation = invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        return {"success": False, "message": "Invitation not found."}
    
    trip_id = invitation["trip_id"]
    invitee_id = invitation["invitee_id"]
    
    # Add user to trip's member list ($addToSet prevents duplicates)
    result = calendars.update_one(
        {"_id": ObjectId(trip_id)},
        {"$addToSet": {"members": invitee_id}}
    )
    
    # Remove the invitation after acceptance
    invitations.delete_one({"_id": ObjectId(invitation_id)})
    
    if result.matched_count == 1:
        return {"success": True, "message": "Invitation accepted."}
    return {"success": False, "message": "Failed to accept invitation."}

@app.post("/invitations/{invitation_id}/reject")
async def reject_invitation(invitation_id: str):
    """Reject a trip invitation"""
    from bson import ObjectId
    
    # Simply delete the invitation without adding user to trip
    result = invitations.delete_one({"_id": ObjectId(invitation_id)})
    
    if result.deleted_count == 1:
        return {"success": True, "message": "Invitation rejected."}
    return {"success": False, "message": "Invitation not found."}

@app.get("/invitations/trip/{trip_id}")
async def get_trip_invitations(trip_id: str):
    """Get all pending invitations for a specific trip (for trip owner to view)"""
    # Find all pending invitations for this trip
    trip_invitations = list(invitations.find({
        "trip_id": trip_id
    }))
    
    # Enrich with invitee usernames for display
    enriched_invitations = []
    for inv in trip_invitations:
        from bson import ObjectId
        invitee = users.find_one({"_id": ObjectId(inv["invitee_id"])})
        
        if invitee:
            inv["_id"] = str(inv["_id"])
            inv["invitee_username"] = invitee["username"]
            enriched_invitations.append(inv)
    
    return {"success": True, "invitations": enriched_invitations}

