
import React, { useState, useEffect } from 'react';
import { StudentGroup } from '../../types';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { PencilIcon, TrashIcon } from '../icons';
import Modal from './Modal';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: StudentGroup[];
  trainerId: string;
  onUpdate: () => void; // To refresh the dashboard list
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({ isOpen, onClose, groups, trainerId, onUpdate }) => {
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (editingGroup) {
      setGroupName(editingGroup.name);
    } else {
      setGroupName('');
    }
  }, [editingGroup]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      if (editingGroup) {
        const groupRef = doc(db, 'studentGroups', editingGroup.id);
        await updateDoc(groupRef, { name: groupName.trim() });
      } else {
        await addDoc(collection(db, 'studentGroups'), {
          name: groupName.trim(),
          trainerId: trainerId,
        });
      }
      onUpdate();
      setEditingGroup(null);
      setGroupName('');
    } catch (error) {
      console.error("Error saving group:", error);
      alert("Não foi possível salvar o grupo.");
    }
  };

  const handleDelete = async (groupId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este grupo? Os alunos não serão excluídos, apenas removidos do grupo.")) {
        try {
            await deleteDoc(doc(db, "studentGroups", groupId));
            // Note: This does not automatically remove the groupId from students.
            // A more robust solution would use a cloud function to clean this up.
            // For now, the group just won't resolve to a name anymore.
            onUpdate();
        } catch (error) {
            console.error("Error deleting group:", error);
            alert("Não foi possível excluir o grupo.");
        }
    }
  };

  return (
    <Modal title="Gerenciar Grupos" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2">{editingGroup ? `Editando Grupo: ${editingGroup.name}`: 'Adicionar Novo Grupo'}</h3>
          <form onSubmit={handleSave} className="space-y-4 p-4 border rounded-md bg-gray-50">
            <div className="flex items-end gap-4">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700">Nome do Grupo</label>
                <input 
                  type="text" 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)} 
                  className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" 
                  placeholder="Ex: Turma das 18h"
                  required 
                />
              </div>
              <button type="submit" className="px-4 py-2 font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">{editingGroup ? 'Salvar' : 'Adicionar'}</button>
              {editingGroup && (
                  <button type="button" onClick={() => setEditingGroup(null)} className="px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
              )}
            </div>
          </form>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-2">Grupos Existentes</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {groups.length > 0 ? (
              <ul className="divide-y">
                {groups.map(group => (
                  <li key={group.id} className="p-3 flex justify-between items-center">
                    <p className="font-semibold">{group.name}</p>
                    <div className="flex gap-4">
                        <button onClick={() => setEditingGroup(group)} className="text-gray-500 hover:text-brand-primary">
                            <PencilIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => handleDelete(group.id)} className="text-gray-500 hover:text-red-600">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 p-4">Nenhum grupo cadastrado.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GroupManagementModal;
