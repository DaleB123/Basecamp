import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from './Icons';

const CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Electronics",
  "Documents",
  "Food & Drink",
  "Medical",
  "Miscellaneous"
];

const PackingListModal = ({ isOpen, onClose, packingList, onSave, currentID }) => {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('shared'); // 'shared' or 'personal'
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (Array.isArray(packingList)) {
      setItems(packingList);
    } else if (typeof packingList === 'string' && packingList.length > 0) {
        // Migration for legacy string data
        setItems([{
            id: Date.now().toString(),
            text: packingList,
            is_checked: false,
            category: "Miscellaneous",
            is_shared: true,
            owner_id: currentID || ""
        }]);
    } else {
      setItems([]);
    }
  }, [packingList, isOpen, currentID]);

  const saveItems = async (newItems) => {
    setIsSaving(true);
    try {
        await onSave(newItems);
    } catch (error) {
        console.error("Failed to save packing list", error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: newItemText,
      is_checked: false,
      category: newItemCategory,
      is_shared: activeTab === 'shared',
      owner_id: currentID || ""
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewItemText('');
    saveItems(updatedItems);
  };

  const handleToggleItem = (itemId) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, is_checked: !item.is_checked } : item
    );
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const handleDeleteItem = (itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const handleClearList = () => {
    if (window.confirm("Are you sure you want to clear all items in this list?")) {
        const itemsToKeep = items.filter(item => {
            if (activeTab === 'shared') return !item.is_shared;
            return item.is_shared || item.owner_id !== currentID;
        });
        setItems(itemsToKeep);
        saveItems(itemsToKeep);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'shared') return item.is_shared;
    return !item.is_shared && item.owner_id === currentID;
  });

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Packing List</h2>
            <div className="tabs tabs-boxed">
                <a className={`tab ${activeTab === 'shared' ? 'tab-active' : ''}`} onClick={() => setActiveTab('shared')}>Group List</a>
                <a className={`tab ${activeTab === 'personal' ? 'tab-active' : ''}`} onClick={() => setActiveTab('personal')}>My List</a>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
            {Object.keys(groupedItems).length === 0 && (
                <div className="text-center text-gray-500 mt-10">No items yet. Add one below!</div>
            )}
            
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="mb-6">
                    <h3 className="font-bold text-lg mb-2 text-primary border-b border-base-300 pb-1">{category}</h3>
                    <div className="space-y-2">
                        {categoryItems.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-base-200 p-2 rounded hover:bg-base-300 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="checkbox checkbox-primary checkbox-sm"
                                    checked={item.is_checked}
                                    onChange={() => handleToggleItem(item.id)}
                                />
                                <span className={`flex-1 ${item.is_checked ? 'line-through text-gray-500' : ''}`}>{item.text}</span>
                                <button 
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="btn btn-ghost btn-xs text-error"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-4 pt-4 border-t border-base-300">
            <div className="flex gap-2 mb-4">
                <select 
                    className="select select-bordered select-sm"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input 
                    type="text" 
                    className="input input-bordered input-sm flex-1" 
                    placeholder="Add new item..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddItem}>
                    <div className="w-5 h-5"><PlusIcon /></div> Add
                </button>
            </div>

            <div className="modal-action flex justify-between gap-2 items-center">
                <button className="btn btn-error btn-outline" onClick={handleClearList}>Clear List</button>
                <div className="flex gap-2 items-center">
                    {isSaving && <span className="loading loading-spinner loading-sm text-primary"></span>}
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListModal;
