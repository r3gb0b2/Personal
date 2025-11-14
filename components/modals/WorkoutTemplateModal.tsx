import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { WorkoutTemplate, Exercise } from '../../types';
import Modal from './Modal';
import WorkoutEditor from '../WorkoutEditor';
import { PlusIcon, PencilIcon, TrashIcon } from '../icons';

interface WorkoutTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  trainerId: string;
  onUpdate: () => void;
}

const WorkoutTemplateModal: React.FC<WorkoutTemplateModalProps> = ({ isOpen, onClose, templates, trainerId, onUpdate }) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = async (templateData: Omit<WorkoutTemplate, 'id' | 'trainerId'> | WorkoutTemplate) => {
    try {
        if ('id' in templateData) {
            // Update existing template
            const templateRef = doc(db, 'workoutTemplates', templateData.id);
            const dataToUpdate = { ...templateData };
            delete (dataToUpdate as any).id; // Firestore security
            await updateDoc(templateRef, dataToUpdate);
        } else {
            // Add new template
            await addDoc(collection(db, 'workoutTemplates'), {
                ...templateData,
                trainerId: trainerId,
            });
        }
        onUpdate();
        setIsAdding(false);
        setEditingTemplate(null);
    } catch (error) {
        console.error("Error saving workout template:", error);
        alert("Não foi possível salvar o modelo de treino.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.")) {
        await deleteDoc(doc(db, "workoutTemplates", id));
        onUpdate();
    }
  };

  if (isAdding || editingTemplate) {
    return (
        <Modal 
            title={editingTemplate ? "Editar Modelo" : "Novo Modelo de Treino"} 
            isOpen={isOpen} 
            onClose={() => { setIsAdding(false); setEditingTemplate(null); }}
            size="xl"
        >
            <WorkoutEditor
                initialData={editingTemplate}
                onSave={handleSave as any}
                onCancel={() => { setIsAdding(false); setEditingTemplate(null); }}
                trainerId={trainerId}
                isTemplateMode={true}
            />
        </Modal>
    );
  }

  return (
    <Modal title="Modelos de Treino" isOpen={isOpen} onClose={onClose} size="lg">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-gray-600">Crie treinos reutilizáveis para aplicar aos seus alunos.</p>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                    <PlusIcon className="w-5 h-5" /> Novo Modelo
                </button>
            </div>
            <div className="space-y-3 border rounded-lg p-2 max-h-[60vh] overflow-y-auto">
                {templates.length > 0 ? templates.map(t => (
                    <div key={t.id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg text-brand-dark">{t.title}</p>
                                <p className="text-sm text-gray-500">{t.exercises?.length || 0} exercícios</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingTemplate(t)} className="text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 p-8">Nenhum modelo de treino criado.</p>}
            </div>
        </div>
    </Modal>
  );
};

export default WorkoutTemplateModal;