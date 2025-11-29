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
  const [isSaving, setIsSaving] = useState(false);
  const [addingCategory, setAddingCategory] = useState(null);
  const [addingText, setAddingText] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [extraCategories, setExtraCategories] = useState([]); // To track empty categories

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

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
        const categoryName = newCategoryName.trim();
        // Add to extra categories if not already there
        if (!extraCategories.some(c => c.name === categoryName && c.tab === activeTab)) {
            setExtraCategories([...extraCategories, { name: categoryName, tab: activeTab }]);
        }
        setNewCategoryName('');
        setIsAddingNewCategory(false);
        // Automatically open the "Add Item" input for this new category
        setAddingCategory(categoryName);
    }
  };

  const handleInlineSubmit = (category) => {
    if (!addingText.trim()) return;

    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: addingText,
      is_checked: false,
      category: category,
      is_shared: activeTab === 'shared',
      owner_id: currentID || ""
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setAddingText('');
    setAddingCategory(null);
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
        // Also clear extra categories for the current tab
        setExtraCategories(prev => prev.filter(c => c.tab !== activeTab));
        saveItems(itemsToKeep);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'shared') return item.is_shared;
    return !item.is_shared && item.owner_id === currentID;
  });

  // Get all used categories
  const usedCategories = [...new Set(filteredItems.map(i => i.category))];
  
  // Combine used and extra categories for current tab
  const currentExtraCategories = extraCategories
    .filter(c => c.tab === activeTab)
    .map(c => c.name);
    
  const displayCategories = [...new Set([...usedCategories, ...currentExtraCategories])];

  // Group items
  const groupedItems = displayCategories.reduce((acc, category) => {
    acc[category] = filteredItems.filter(i => i.category === category);
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
        
        <div className="flex-1 overflow-y-auto pr-2 group/list relative">
            {isAddingNewCategory && (
                <div className="bg-base-200 p-4 rounded-lg mb-4">
                    <h3 className="font-bold mb-2">New Category</h3>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            className="input input-bordered input-sm flex-1"
                            placeholder="Category Name"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleCreateCategory}>Create</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setIsAddingNewCategory(false)}>Cancel</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.filter(c => !displayCategories.includes(c)).map(cat => (
                            <button 
                                key={cat} 
                                className="badge badge-outline cursor-pointer hover:bg-primary hover:text-primary-content"
                                onClick={() => {
                                    setNewCategoryName(cat);
                                    if (!extraCategories.some(c => c.name === cat && c.tab === activeTab)) {
                                         setExtraCategories([...extraCategories, { name: cat, tab: activeTab }]);
                                         setAddingCategory(cat);
                                         setIsAddingNewCategory(false);
                                    }
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {displayCategories.length === 0 && !isAddingNewCategory && (
                <div className="text-center text-gray-500 mt-10">
                    No items yet. Click "Add Category" to start!
                </div>
            )}
            
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="mb-6 group">
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
                    
                    {addingCategory === category ? (
                        <div className="mt-2 flex gap-2">
                            <input 
                                type="text" 
                                className="input input-bordered input-sm flex-1"
                                autoFocus
                                placeholder={`Add to ${category}...`}
                                value={addingText}
                                onChange={(e) => setAddingText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSubmit(category);
                                    if (e.key === 'Escape') setAddingCategory(null);
                                }}
                            />
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleInlineSubmit(category)}
                            >
                                Add
                            </button>
                            <button 
                                className="btn btn-ghost btn-sm"
                                onClick={() => setAddingCategory(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button 
                            className="btn btn-ghost btn-sm btn-block mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-start text-base-content/50 hover:text-base-content"
                            onClick={() => {
                                setAddingCategory(category);
                                setAddingText('');
                            }}
                        >
                            <PlusIcon /> Add item to {category}
                        </button>
                    )}
                </div>
            ))}

            <div className="opacity-0 group-hover/list:opacity-100 transition-opacity flex justify-center py-4">
                 <button className="btn btn-sm btn-ghost gap-2" onClick={() => setIsAddingNewCategory(true)}>
                    <PlusIcon /> Add New Category
                 </button>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-base-300">
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
