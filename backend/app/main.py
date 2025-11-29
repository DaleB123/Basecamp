from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional
import os

# Create Pydantic models for request validation
class UserCredentials(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    password: str

class LoginCredentials(BaseModel):
    username: str
    password: str

class PackingItem(BaseModel):
    id: str
    text: str
    is_checked: bool
    category: str
    is_shared: bool
    owner_id: str

class Trip(BaseModel):
    owner: str
    name: str
    start: str
    end: str
    description: str
    members: list
    packing_list: List[PackingItem] = []

class Profile(BaseModel):
    old_username: str
    username: str
    email: str
    first_name: str
    last_name: str
    date_created: str

class Event(BaseModel):
    trip_id: str
    creator: str
    title: str
    start: str
    end: str
    type: str
    location: str
    cost: float
    cost_assignments: dict = {}
    details: str
    votes: list = []
    payments: dict = {}

class PasswordUpdate(BaseModel):
    username: str
    currentPassword: str
    newPassword: str

class Invitation(BaseModel):
    trip_id: str
    inviter_id: str
    invitee_username: str

app = FastAPI()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://TripSync:1a2qYb9vOavPeMtw@tripsync.kl0if1g.mongodb.net/")
client = MongoClient(MONGO_URI)
logins = client["Logins"]
users = logins["Accounts"]
trips = client["Trips"]
calendars = trips["Calendars"]
events = trips["Events"]
invitations = trips["Invitations"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI + MongoDB"}

@app.get("/profiles/{username}")
async def get_profile(username: str):
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    
    # Find the user in the database
    user = users.find_one({"username": username})
    
    if user:
        user["_id"] = str(user["_id"])  # Convert ObjectId to string for JSON serialization
        return {"success": True, "profile": user}
    
    return {"success": False, "message": "User not found."}

@app.post("/profiles")
async def update_profile(profile: Profile):
    old_username = profile.old_username
    username = profile.username
    email = profile.email
    first_name = profile.first_name
    last_name = profile.last_name

    if not username:
        return {"success": False, "message": "Username is required."}
    
    # Check if the new username already exists and is different from the old one)
    if users.find_one({"username": username}) and username != old_username:
        return {"success": False, "message": "Username already exists."}
    
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
    username = password_data.username
    current_password = password_data.currentPassword
    new_password = password_data.newPassword

    # Find the user
    user = users.find_one({"username": username})

    if not user:
        return {"success": False, "message": "User not found"}

    # Verify current password
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

@app.post("/login")
async def login(credentials: LoginCredentials):
    username = credentials.username
    password = credentials.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    # Find the user in the database
    user = users.find_one({"username": username})

    # Check if user exists and password is correct
    if user and user["password"] == password:
        return {"success": True, "message": "Login successful!", "id": str(user["_id"])}
    
    return {"success": False, "message": "Invalid username or password."}

@app.post("/signup")
async def signup(credentials: UserCredentials):
    first_name = credentials.first_name
    last_name = credentials.last_name
    username = credentials.username
    password = credentials.password
    email = credentials.email
    date_created = date.today()

    if not username or not password:
        return {"success": False, "message": "Username and password are required."}

    # Check if username already exists
    if users.find_one({"username": username}):
        return {"success": False, "message": "Username already exists."}
    
    # Check if email already exists
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

@app.get("/calendars/users/{id}")
async def get_calendars(id: str):    
    # Find all calendar documents where user is owner or member
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

@app.post("/calendars")
async def create_calendar(trip: Trip): 
    # Create new calendar document
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
    
    # Get the created document and return it
    created_trip = calendars.find_one({"_id": result.inserted_id})
    created_trip["_id"] = str(created_trip["_id"])
    
    return {"success": True, "calendar": created_trip}

@app.put("/calendars/{id}")
async def update_calendar(id: str, trip: Trip):
    from bson import ObjectId
    update_data = {
        "owner": trip.owner,
        "name": trip.name,
        "start": trip.start,
        "end": trip.end,
        "description": trip.description,
        "members": trip.members,
        "packing_list": [item.dict() for item in trip.packing_list]
    }
    result = calendars.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_trip = calendars.find_one({"_id": ObjectId(id)})
        updated_trip["_id"] = str(updated_trip["_id"])
        return {"success": True, "calendar": updated_trip}
    return {"success": False, "message": "Calendar not found."}

@app.delete("/calendars/{id}")
async def delete_calendar(id: str):
    from bson import ObjectId
    result = calendars.delete_one({"_id": ObjectId(id)})

    trip_events = list(events.find({"trip_id": id}))
    for event in trip_events:
        events.delete_one({"_id": ObjectId(event["_id"])})
    # Delete any pending invitations for this trip
    invitations.delete_many({"trip_id": id})

    if result.deleted_count == 1:
        return {"success": True, "message": "Trip deleted successfully."}
    return {"success": False, "message": "Trip not found."}

@app.post("/events")
async def create_event(event: Event):
    new_event = {
        "trip_id": event.trip_id,
        "creator": event.creator,
        "title": event.title,
        "start": event.start,
        "end": event.end,
        "type": event.type,
        "location": event.location,
        "cost": event.cost,
        "cost_assignments": event.cost_assignments,
        "details": event.details,
        "votes": event.votes,
        "payments": event.payments
    }
    result = events.insert_one(new_event)

    created_event = events.find_one({"_id": result.inserted_id})
    created_event["_id"] = str(created_event["_id"])
    return {"success": True, "event": created_event}

@app.get("/events/trip/{trip_id}")
async def get_events(trip_id: str):
    # Find all event documents associated with the trip_id
    trip_events = list(events.find({"trip_id": trip_id}))
    
    # Convert ObjectId to string for JSON serialization
    for event in trip_events:
        event["_id"] = str(event["_id"])
    
    if trip_events:
        return {"success": True, "events": trip_events}
    
    return {"success": False, "message": "No events found for this trip."}

@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    from bson import ObjectId
    result = events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 1:
        return {"success": True, "message": "Event deleted successfully."}
    return {"success": False, "message": "Event not found."}

@app.put("/events/{event_id}")
async def update_event(event_id: str, event: Event):
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
        "cost_assignments": event.cost_assignments, 
        "details": event.details,
        "votes": event.votes,
        "payments": event.payments
    }
    result = events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_event = events.find_one({"_id": ObjectId(event_id)})
        updated_event["_id"] = str(updated_event["_id"])
        return {"success": True, "event": updated_event}
    return {"success": False, "message": "Event not found."}

# Invitation endpoints
@app.post("/invitations")
async def create_invitation(invitation: Invitation):
    # Check if invitee exists
    invitee = users.find_one({"username": invitation.invitee_username})
    if not invitee:
        return {"success": False, "message": "User not found."}
    
    invitee_id = str(invitee["_id"])
    
    # Check if invitation already exists
    existing = invitations.find_one({
        "trip_id": invitation.trip_id,
        "invitee_id": invitee_id
    })
    if existing:
        return {"success": False, "message": "Invitation already sent."}
    
    # Check if user is already a member
    from bson import ObjectId
    trip = calendars.find_one({"_id": ObjectId(invitation.trip_id)})
    if trip and invitee_id in trip.get("members", []):
        return {"success": False, "message": "User is already a member of this trip."}
    
    # Create invitation
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
    # Get all invitations for the user
    user_invitations = list(invitations.find({
        "invitee_id": user_id
    }))
    
    from bson import ObjectId
    # Enrich invitations with trip and inviter details
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
    from bson import ObjectId
    
    invitation = invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        return {"success": False, "message": "Invitation not found."}
    
    # Add user to trip members
    trip_id = invitation["trip_id"]
    invitee_id = invitation["invitee_id"]
    
    result = calendars.update_one(
        {"_id": ObjectId(trip_id)},
        {"$addToSet": {"members": invitee_id}}
    )
    
    # Delete the invitation
    invitations.delete_one({"_id": ObjectId(invitation_id)})
    
    if result.matched_count == 1:
        return {"success": True, "message": "Invitation accepted."}
    return {"success": False, "message": "Failed to accept invitation."}

@app.post("/invitations/{invitation_id}/reject")
async def reject_invitation(invitation_id: str):
    from bson import ObjectId
    
    # Delete the invitation
    result = invitations.delete_one({"_id": ObjectId(invitation_id)})
    
    if result.deleted_count == 1:
        return {"success": True, "message": "Invitation rejected."}
    return {"success": False, "message": "Invitation not found."}

@app.get("/invitations/trip/{trip_id}")
async def get_trip_invitations(trip_id: str):
    # Get all invitations for a specific trip
    trip_invitations = list(invitations.find({
        "trip_id": trip_id
    }))
    
    # Enrich invitations with invitee details
    enriched_invitations = []
    for inv in trip_invitations:
        from bson import ObjectId
        invitee = users.find_one({"_id": ObjectId(inv["invitee_id"])})
        
        if invitee:
            inv["_id"] = str(inv["_id"])
            inv["invitee_username"] = invitee["username"]
            enriched_invitations.append(inv)
    
    return {"success": True, "invitations": enriched_invitations}

