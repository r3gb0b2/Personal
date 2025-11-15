import React, { useState, useMemo, useEffect } from 'react';
import { Student, Workout, StudentGroup } from '../../types';
import Modal from './Modal';
import { CloneIcon } from '../icons';

interface CloneWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutToClone: Workout;
  students: Student[];
  groups: StudentGroup[];
  currentStudentId: string;
  onClone: (targetStudentIds: string[]) => Promise<{success: boolean, message?: string}>;
}

const CloneWorkoutModal: React.FC<CloneWorkoutModalProps> = ({ isOpen, onClose, workoutToClone, students, groups, currentStudentId, onClone }) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'cloning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const otherStudents = useMemo(() => students.filter(s => s.id !== currentStudentId), [students, currentStudentId]);

  // Reset state when modal is closed or reopened
  useEffect(() => {
    if (!isOpen) {
        setSelectedStudentIds([]);
        setStatus('idle');
        setErrorMessage('');
    }
  }, [isOpen]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
      if (selectedStudentIds.length === otherStudents.length) {
          setSelectedStudentIds([]);
      } else {
          setSelectedStudentIds(otherStudents.map(s => s.id));
      }
  }

  const handleGroupSelect = (groupId: string) => {
    const studentsInGroup = otherStudents.filter(s => s.groupIds?.includes(groupId));
    const studentIdsInGroup = studentsInGroup.map(s => s.id);

    // Add students from the selected group to the current selection, avoiding duplicates.
    setSelectedStudentIds(prev => [...new Set([...prev, ...studentIdsInGroup])]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Por favor, selecione pelo menos um aluno.");
      setStatus('error');
      return;
    }
    
    setStatus('cloning');
    setErrorMessage('');
    
    const result = await onClone(selectedStudentIds);
    
    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        // State is reset by useEffect on close
      }, 1500);
    } else {
      setErrorMessage(result.message || 'Ocorreu um erro desconhecido.');
      setStatus('error');
    }
  };
  
  const renderContent = () => {
    if (status === 'success') {
        return (
            <div className="text-center p-8">
                <h3 className="text-2xl font-bold text-green-600">Treino clonado com sucesso!</h3>
            </div>
        );
    }
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <p>Selecione para quais alunos você deseja copiar a planilha de treino <strong className="font-semibold text-brand-dark">{workoutToClone.title}</strong>.</p>
        
        {groups.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-md border">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">Atalho: Selecionar por Grupo</h4>
                <div className="flex flex-wrap gap-2">
                    {groups.map(group => (
                        <button 
                            type="button" 
                            key={group.id}
                            onClick={() => handleGroupSelect(group.id)}
                            className="px-3 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 rounded-full hover:bg-cyan-200"
                        >
                            + {group.name}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="border rounded-md max-h-64 overflow-y-auto p-2">
            <div className="flex justify-end mb-2 pr-2">
                 <button type="button" onClick={handleSelectAll} className="text-sm font-medium text-brand-primary hover:text-brand-accent">
                    {selectedStudentIds.length === otherStudents.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
            </div>
          {otherStudents.length > 0 ? (
            otherStudents.map(student => (
              <label key={student.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{student.name}</span>
              </label>
            ))
          ) : (
            <p className="p-4 text-center text-gray-500">Nenhum outro aluno encontrado.</p>
          )}
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errorMessage}</p>
        )}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} disabled={status === 'cloning'} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancelar
          </button>
          <button type="submit" disabled={status === 'cloning' || selectedStudentIds.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
            <CloneIcon className="w-5 h-5"/>
            {status === 'cloning' ? 'Clonando...' : `Clonar para ${selectedStudentIds.length} Aluno(s)`}
          </button>
        </div>
      </form>
    );
  };
  
  return (
    <Modal title={`Clonar Treino: ${workoutToClone.title}`} isOpen={isOpen} onClose={onClose}>
        {renderContent()}
    </Modal>
  );
};

export default CloneWorkoutModal;