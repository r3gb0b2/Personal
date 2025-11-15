import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { Trainer, PendingStudent } from '../../types';

interface StudentRegistrationProps {
  trainerId: string;
  onRegistrationComplete: () => void;
}

const StudentRegistration: React.FC<StudentRegistrationProps> = ({ trainerId, onRegistrationComplete }) => {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
  });
  const [view, setView] = useState<'form' | 'success'>('form');

  useEffect(() => {
    const fetchTrainer = async () => {
      try {
        const trainerRef = doc(db, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);
        if (trainerSnap.exists()) {
          setTrainer({ id: trainerSnap.id, ...trainerSnap.data() } as Trainer);
        } else {
          setError('O personal trainer especificado não foi encontrado.');
        }
      } catch (e) {
        setError('Ocorreu um erro ao carregar as informações. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrainer();
  }, [trainerId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const pendingStudentData: Omit<PendingStudent, 'id'> = {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim(),
            birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
            trainerId: trainerId,
            status: 'pending',
            submittedAt: new Date().toISOString(),
        };

        await addDoc(collection(db, 'pendingStudents'), {
            ...pendingStudentData,
            submittedAt: Timestamp.now(),
            birthDate: pendingStudentData.birthDate ? Timestamp.fromDate(new Date(pendingStudentData.birthDate)) : null,
        });

        setView('success');

    } catch (err) {
        setError('Não foi possível enviar seu cadastro. Tente novamente.');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  if (view === 'success') {
    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
          <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl text-center">
            <h2 className="text-3xl font-extrabold text-brand-dark">Cadastro Enviado!</h2>
            <p className="text-gray-600">
              Sua solicitação foi enviada para <strong>{trainer?.fullName || trainer?.username}</strong>. Você será notificado por e-mail quando seu acesso for liberado.
            </p>
            <button
              onClick={onRegistrationComplete}
              className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent"
            >
              Voltar para a Página Inicial
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
        {loading ? (
            <div className="text-center p-8">Carregando...</div>
        ) : (
            <>
              <div>
                <h2 className="text-3xl font-extrabold text-center text-brand-dark">
                  Cadastro de Aluno
                </h2>
                {trainer && (
                    <p className="mt-2 text-center text-sm text-gray-600">
                    Com <span className="font-semibold">{trainer.fullName || trainer.username}</span>
                    </p>
                )}
              </div>
              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nome Completo" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300"/>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Seu melhor e-mail" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300"/>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Telefone (WhatsApp)" className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300"/>
                <div>
                    <label className="text-sm text-gray-500">Data de Nascimento</label>
                    <input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300"/>
                </div>
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div>
                  <button
                    type="submit"
                    disabled={!trainer}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent disabled:bg-gray-400"
                  >
                    Enviar Cadastro
                  </button>
                </div>
              </form>
              <div className="text-center">
                <button onClick={onRegistrationComplete} className="font-medium text-sm text-brand-primary hover:text-brand-accent">
                    Já tem acesso? Faça login
                </button>
              </div>
            </>
        )}
      </div>
    </div>
  );
};

export default StudentRegistration;
