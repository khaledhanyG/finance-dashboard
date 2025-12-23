
import React, { useState, useEffect } from 'react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue.toLowerCase() === 'delete') {
      onConfirm();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-rose-100 p-3 rounded-full">
              <i className="fas fa-exclamation-triangle text-rose-600 text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Confirm Deletion</h3>
              <p className="text-sm text-slate-500">You are about to delete <span className="font-bold text-slate-700">"{itemName}"</span>.</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl mb-6">
            <p className="text-sm text-slate-600 mb-3">
              This action is permanent and cannot be undone. To confirm, please type <span className="font-mono font-bold text-rose-600">delete</span> below.
            </p>
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder='Type "delete" here...'
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${
                error ? 'border-rose-500 focus:ring-rose-200 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]' : 'border-slate-200 focus:ring-indigo-100'
              }`}
            />
            {error && <p className="text-xs text-rose-500 mt-2 font-medium">Please type exactly "delete" to proceed.</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
