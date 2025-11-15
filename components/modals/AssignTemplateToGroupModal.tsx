import React, { useState, useEffect } from 'react';
import { StudentGroup } from '../../types';
import Modal from './Modal';
import { UsersIcon } from '../icons';

interface AssignTemplateToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateTitle: string;
  groups: StudentGroup[];
  onAssign: (targetGroupIds: string[]) => Promise<void>;
}

const AssignTemplateToGroupModal: React.FC<AssignTemplateToGroupModalProps> = ({ isOpen, onClose, templateTitle, groups, onAssign }) => {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'assigning'>('idle');

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0) return;
    
    setStatus('assigning');
    try {
        await onAssign(selectedGroupIds);
    } finally {
        // The parent component will handle closing and success/error messages.
        setStatus('idle');
    }
  };
  
  // Reset state when modal is closed/reopened
  useEffect(() => {
      if (!isOpen) {
          setSelectedGroupIds([]);
          setStatus('idle');
      }
  }, [isOpen]);

  return (
    <Modal title={`Atribuir "${templateTitle}"`} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p>Selecione os grupos de alunos que receberão esta planilha de treino.</p>
        
        <div className="border rounded-md max-h-64 overflow-y-auto p-2">
          {groups.length > 0 ? (
            groups.map(group => (
              <label key={group.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(group.id)}
                  onChange={() => handleGroupToggle(group.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{group.name}</span>
              </label>
            ))
          ) : (
            <p className="p-4 text-center text-gray-500">Nenhum grupo encontrado. Crie grupos em "Gerenciar Grupos".</p>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} disabled={status === 'assigning'} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancelar
          </button>
          <button type="submit" disabled={status === 'assigning' || selectedGroupIds.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
            <UsersIcon className="w-5 h-5"/>
            {status === 'assigning' ? 'Atribuindo...' : `Atribuir a ${selectedGroupIds.length} Grupo(s)`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignTemplateToGroupModal;