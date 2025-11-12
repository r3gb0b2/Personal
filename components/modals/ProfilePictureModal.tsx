import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Student } from '../../types';
import Modal from './Modal';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CameraIcon } from '../icons';

interface ProfilePictureModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent: (student: Student) => Promise<void>;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({ student, isOpen, onClose, onUpdateStudent }) => {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(student.profilePictureUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera access denied:", err);
          setError("Acesso à câmera negado. Por favor, verifique as permissões no seu navegador.");
          setMode('select');
        }
      };
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMode('preview');
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          stopCamera();
          setMode('preview');
        }
      }, 'image/jpeg');
    }
  };

  const handleSave = async () => {
    if (!imageFile) return;
    setIsUploading(true);
    setError(null);
    
    try {
      const storageRef = ref(storage, `profile_pictures/${student.id}/${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const updatedStudent = { ...student, profilePictureUrl: downloadURL };
      await onUpdateStudent(updatedStudent);
      
      onClose();
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Falha ao enviar a imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const reset = () => {
      setMode('select');
      setImageFile(null);
      setPreviewUrl(student.profilePictureUrl || null);
      setError(null);
  }

  const handleClose = () => {
      stopCamera();
      onClose();
  }

  const renderContent = () => {
    switch (mode) {
      case 'camera':
        return (
          <div className="flex flex-col items-center">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-md bg-black"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <button onClick={handleCapture} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-md flex items-center gap-2">
                <CameraIcon className="w-5 h-5"/> Tirar Foto
            </button>
          </div>
        );
      case 'preview':
        return (
            <div className="flex flex-col items-center">
                {previewUrl && <img src={previewUrl} alt="Preview" className="w-48 h-48 rounded-full object-cover mb-4"/>}
            </div>
        );
      case 'select':
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-gray-600">Escolha uma opção para definir a foto de {student.name}.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-md font-semibold hover:bg-gray-200"
            >
              Enviar Foto
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
            <button
              onClick={() => setMode('camera')}
              className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-md font-semibold hover:bg-gray-200"
            >
              Usar Câmera
            </button>
          </div>
        );
    }
  };

  return (
    <Modal title="Alterar Foto de Perfil" isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        {error && <p className="text-red-500 text-center">{error}</p>}
        {renderContent()}
        <div className="flex justify-end gap-4 pt-4 mt-4 border-t">
          {mode !== 'select' ? (
             <button
                type="button"
                onClick={reset}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Voltar
              </button>
          ) : (
            <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
          )}
          {mode === 'preview' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400"
            >
              {isUploading ? 'Salvando...' : 'Salvar Foto'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfilePictureModal;
