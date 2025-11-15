import React, { useState } from 'react';
import { db } from '../../firebase';
// Fix: Use scoped Firebase package for consistency.
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from '@firebase/firestore';
import { WorkoutTemplate, Exercise, Student, StudentGroup } from '../../types';
import Modal from './Modal';
import WorkoutEditor from '../WorkoutEditor';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '../icons';
import AssignTemplateToGroupModal from './AssignTemplateToGroupModal';

interface WorkoutTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  trainerId: string;
  onUpdate: () => void;
  students: Student[];
  groups: StudentGroup[];
}

const WorkoutTemplateModal: React.FC<WorkoutTemplateModalProps> = ({ isOpen, onClose, templates, trainerId, onUpdate, students, groups }) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<WorkoutTemplate | null>(null);

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
  
  const handleAssignTemplateToGroups = async (groupIds: string[]) => {
    if (!templateToAssign) return;

    const targetStudents = students.filter(student => 
        student.groupIds?.some(sgid => groupIds.includes(sgid))
    );

    if (targetStudents.length === 0) {
        alert("Nenhum aluno encontrado nos grupos selecionados.");
        return;
    }

    const confirmMessage = `Você está prestes a atribuir o treino "${templateToAssign.title}" para ${targetStudents.length} aluno(s). Deseja continuar?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const creationPromises = targetStudents.map(student => {
          const newWorkoutData = {
              title: templateToAssign.title,
              exercises: templateToAssign.exercises || [],
              studentId: student.id,
              trainerId: trainerId,
              createdAt: Timestamp.now(),
          };
          return addDoc(collection(db, 'workouts'), newWorkoutData);
      });

      await Promise.all(creationPromises);
      alert("Treino atribuído com sucesso!");
      setTemplateToAssign(null);
    } catch (error) {
      console.error("Error assigning template to group:", error);
      alert("Ocorreu um erro ao atribuir o treino.");
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
    <>
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
                                  <button onClick={() => setTemplateToAssign(t)} className="text-gray-500 hover:text-green-600" title="Atribuir a um grupo">
                                      <UsersIcon className="w-5 h-5"/>
                                  </button>
                                  <button onClick={() => setEditingTemplate(t)} className="text-gray-500 hover:text-blue-600" title="Editar modelo">
                                      <PencilIcon className="w-5 h-5"/>
                                  </button>
                                  <button onClick={() =>