import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { LibraryExercise, TrainerSuggestion, Trainer } from '../../types';
import Modal from '../modals/Modal';
import { PencilIcon, TrashIcon, CheckCircleIcon, XIcon } from '../icons';

interface ExerciseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryExercises: LibraryExercise[];
  trainerSuggestions: TrainerSuggestion[];
  trainers: Trainer[];
  onUpdate: () => void;
}

type Tab = 'library' | 'suggestions';
const initialFormState: Omit<LibraryExercise, 'id'> = { name: '', sets: '', reps: '', rest: '', notes: '', youtubeUrl: '' };

const ExerciseManagementModal: React.FC<ExerciseManagementModalProps> = ({ isOpen, onClose, libraryExercises, trainerSuggestions, trainers, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('suggestions');
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [formState, setFormState] = useState(initialFormState);

  const trainerMap = new Map(trainers.map(t => [t.id, t.username]));

  useEffect(() => {
    // If there are suggestions, default to that tab. Otherwise, library tab.
    setActiveTab(trainerSuggestions.length > 0 ? 'suggestions' : 'library');
  }, [trainerSuggestions]);
  
  useEffect(() => {
    if (editingExercise) {
        setFormState(editingExercise);
    } else {
        setFormState(initialFormState);
    }
  }, [editingExercise]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;

    try {
        if (editingExercise) {
            const exerciseRef = doc(db, 'libraryExercises', editingExercise.id);
            await updateDoc(exerciseRef, { ...formState });
        } else {
            await addDoc(collection(db, 'libraryExercises'), formState);
        }
        onUpdate();
        setEditingExercise(null);
        setFormState(initialFormState);
    } catch (error) {
        console.error("Error saving library exercise:", error);
        alert("Não foi possível salvar o exercício.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este exercício da biblioteca global?")) {
        await deleteDoc(doc(db, 'libraryExercises', id));
        onUpdate();
    }
  };

  const handleApprove = async (suggestion: TrainerSuggestion) => {
      const { id, status, submittedAt, trainerId, ...exerciseData } = suggestion;
      try {
        // Add to global library
        await addDoc(collection(db, 'libraryExercises'), exerciseData);
        // Update suggestion status
        const suggestionRef = doc(db, 'trainerSuggestions', id);
        await updateDoc(suggestionRef, { status: 'approved' });
        onUpdate();
      } catch (error) {
          console.error("Error approving suggestion", error);
          alert("Erro ao aprovar a sugestão.");
      }
  };

  const handleReject = async (suggestionId: string) => {
    try {
        const suggestionRef = doc(db, 'trainerSuggestions', suggestionId);
        await updateDoc(suggestionRef, { status: 'rejected' });
        onUpdate();
    } catch (error) {
        console.error("Error rejecting suggestion", error);
        alert("Erro ao rejeitar a sugestão.");
    }
  };

  const TabButton = ({ tab, label, count }: { tab: Tab; label: string; count?: number }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 ${
        activeTab === tab
          ? 'border-brand-primary text-brand-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <Modal title="Gerenciar Exercícios" isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex border-b">
        <TabButton tab="suggestions" label="Sugestões dos Personais" count={trainerSuggestions.length} />
        <TabButton tab="library" label="Exercícios Globais" />
      </div>

      <div className="pt-4 max-h-[65vh] overflow-y-auto">
        {activeTab === 'suggestions' && (
          <div className="space-y-3">
            {trainerSuggestions.length > 0 ? trainerSuggestions.map(s => (
                <div key={s.id} className="p-3 border rounded-lg bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg text-brand-dark">{s.name}</p>
                            <p className="text-xs text-gray-500">Sugerido por: {trainerMap.get(s.trainerId) || 'Desconhecido'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleApprove(s)} className="flex items-center gap-1 text-green-600 hover:text-green-800" title="Aprovar e adicionar à biblioteca"><CheckCircleIcon className="w-5 h-5"/> Aprovar</button>
                            <button onClick={() => handleReject(s.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700" title="Rejeitar sugestão"><XIcon className="w-5 h-5"/> Rejeitar</button>
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        <p><strong>Séries:</strong> {s.sets}, <strong>Reps:</strong> {s.reps}, <strong>Descanso:</strong> {s.rest}</p>
                        {s.notes && <p><strong>Notas:</strong> {s.notes}</p>}
                    </div>
                </div>
            )) : <p className="text-center text-gray-500 p-8">Nenhuma nova sugestão de exercício.</p>}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">{editingExercise ? `Editando: ${editingExercise.name}`: 'Adicionar Novo Exercício Global'}</h3>
              <form onSubmit={handleSave} className="space-y-3 p-4 border rounded-md bg-gray-50">
                 <input type="text" name="name" value={formState.name} onChange={handleInputChange} placeholder="Nome do Exercício" className="text-md font-semibold w-full border-gray-300 rounded-md" required />
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input type="text" name="sets" value={formState.sets} onChange={handleInputChange} placeholder="Séries" className="text-sm w-full border-gray-300 rounded-md"/>
                    <input type="text" name="reps" value={formState.reps} onChange={handleInputChange} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/>
                    <input type="text" name="rest" value={formState.rest} onChange={handleInputChange} placeholder="Descanso" className="text-sm w-full border-gray-300 rounded-md"/>
                    <input type="text" name="youtubeUrl" value={formState.youtubeUrl} onChange={handleInputChange} placeholder="Link YouTube" className="text-sm w-full border-gray-300 rounded-md"/>
                </div>
                <textarea name="notes" value={formState.notes} onChange={handleInputChange} placeholder="Observações" className="text-sm w-full border-gray-300 rounded-md" rows={2}></textarea>
                <div className="flex justify-end gap-2">
                    {editingExercise && <button type="button" onClick={() => setEditingExercise(null)} className="px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-md">Cancelar</button>}
                    <button type="submit" className="px-4 py-2 font-medium text-white bg-brand-primary rounded-md">{editingExercise ? 'Salvar' : 'Adicionar'}</button>
                </div>
              </form>
            </div>
            <div className="space-y-3">
              {libraryExercises.map(ex => (
                  <div key={ex.id} className="p-3 border rounded-lg bg-white">
                      <div className="flex justify-between items-center">
                          <p className="font-semibold">{ex.name}</p>
                          <div className="flex gap-4">
                              <button onClick={() => setEditingExercise(ex)} className="text-gray-500 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                              <button onClick={() => handleDelete(ex.id)} className="text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                          </div>
                      </div>
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExerciseManagementModal;