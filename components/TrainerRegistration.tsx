import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

interface TrainerRegistrationProps {
  onBackToLogin: () => void;
}

const TrainerRegistration: React.FC<TrainerRegistrationProps> = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!formData.username.trim() || !formData.password.trim() || !formData.fullName.trim()) {
        setError('Nome completo, usuário e senha são obrigatórios.');
        return;
    }

    setLoading(true);
    try {
        const trainersRef = collection(db, 'trainers');
        const q = query(trainersRef, where("username", "==", formData.username.trim().toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
            setLoading(false);
            return;
        }

        await addDoc(trainersRef, {
            fullName: formData.fullName.trim(),
            username: formData.username.trim().toLowerCase(),
            contactEmail: formData.contactEmail.trim().toLowerCase(),
            password: formData.password,
            status: 'pending',
        });

        setSuccess('Cadastro realizado com sucesso! Sua conta será revisada pelo administrador e ativada em breve.');
        setFormData({ fullName: '', username: '', contactEmail: '', password: '', confirmPassword: '' });

    } catch (err) {
        console.error("Error during registration:", err);
        setError('Ocorreu um erro ao realizar o cadastro. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-brand-dark">
            Cadastro de Personal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Preencha seus dados para solicitar acesso.
          </p>
        </div>

        {success ? (
            <div className="text-center p-4 bg-green-100 text-green-800 rounded-md">
                <p>{success}</p>
                <button onClick={onBackToLogin} className="mt-4 font-medium text-sm text-brand-primary hover:text-brand-accent">
                    Voltar para o Login
                </button>
            </div>
        ) : (
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="fullName-input" className="sr-only">Nome Completo</label>
                    <input id="fullName-input" name="fullName" type="text" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" placeholder="Nome Completo" value={formData.fullName} onChange={handleChange}/>
                </div>
                 <div>
                    <label htmlFor="username-input" className="sr-only">Usuário de Acesso</label>
                    <input id="username-input" name="username" type="text" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" placeholder="Usuário de Acesso" value={formData.username} onChange={handleChange}/>
                </div>
                <div>
                    <label htmlFor="email-input" className="sr-only">Email de Contato</label>
                    <input id="email-input" name="contactEmail" type="email" className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" placeholder="Email de Contato (Opcional)" value={formData.contactEmail} onChange={handleChange}/>
                </div>
                <div>
                    <label htmlFor="password-input" className="sr-only">Senha</label>
                    <input id="password-input" name="password" type="password" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" placeholder="Senha" value={formData.password} onChange={handleChange}/>
                </div>
                 <div>
                    <label htmlFor="confirmPassword-input" className="sr-only">Confirmar Senha</label>
                    <input id="confirmPassword-input" name="confirmPassword" type="password" required className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" placeholder="Confirmar Senha" value={formData.confirmPassword} onChange={handleChange}/>
                </div>
            
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div>
                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors disabled:bg-gray-400">
                    {loading ? 'Enviando...' : 'Cadastrar'}
                    </button>
                </div>
            </form>
        )}
        
         <div className="text-center">
            <button onClick={onBackToLogin} className="font-medium text-sm text-brand-primary hover:text-brand-accent">
                Já tem uma conta? Voltar para o login
            </button>
        </div>
      </div>
    </div>
  );
};

export default TrainerRegistration;