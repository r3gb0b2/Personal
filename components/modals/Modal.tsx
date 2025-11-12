
import React from 'react';
import { XIcon } from '../icons';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isClosable?: boolean; // New prop to control closing behavior
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children, size = 'md', isClosable = true }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const handleClose = () => {
    if (isClosable) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-brand-dark">{title}</h2>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 disabled:text-gray-200 disabled:cursor-not-allowed"
            disabled={!isClosable}
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Modal;
