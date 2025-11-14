import React from 'react';
import { Workout } from '../../types';
import { DumbbellIcon } from '../icons';

interface WorkoutPortalProps {
    workouts: Workout[];
    onBack: () => void;
}

const getYoutubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (!videoId) {
            // Handles short URLs like youtu.be/VIDEOID
            const pathParts = urlObj.pathname.split('/');
            videoId = pathParts[pathParts.length - 1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (e) {
        console.error("Invalid YouTube URL:", e);
        return null;
    }
}

const WorkoutPortal: React.FC<WorkoutPortalProps> = ({ workouts, onBack }) => {
    return (
        <>
            <div className="bg-brand-dark">
                <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <DumbbellIcon className="w-8 h-8 text-white"/>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Minha Ficha de Treino</h1>
                    </div>
                    <button onClick={onBack} className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                        <span>Voltar ao Painel</span>
                    </button>
                </header>
            </div>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {workouts.length > 0 ? (
                    <div className="space-y-8">
                        {workouts.map(workout => (
                            <div key={workout.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                                <h2 className="text-2xl font-bold text-brand-dark mb-4">{workout.title}</h2>
                                
                                {/* Mobile View: Card-based layout */}
                                <div className="space-y-4 md:hidden">
                                    {workout.exercises.map(ex => {
                                        const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);
                                        return (
                                            <div key={ex.id} className="bg-gray-50 p-4 rounded-lg border">
                                                <h3 className="font-bold text-lg mb-3 text-brand-secondary">{ex.name}</h3>
                                                
                                                {embedUrl && (
                                                    <div className="mb-4">
                                                        <iframe
                                                            className="w-full aspect-video rounded-md shadow"
                                                            src={embedUrl}
                                                            title={ex.name}
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        ></iframe>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-center border-t border-b py-3">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Séries</p>
                                                        <p className="font-bold text-lg">{ex.sets || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Reps</p>
                                                        <p className="font-bold text-lg">{ex.reps || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Descanso</p>
                                                        <p className="font-bold text-lg">{ex.rest || '-'}</p>
                                                    </div>
                                                </div>

                                                {ex.notes && (
                                                    <div className="mt-3">
                                                        <p className="text-sm font-semibold text-gray-600">Observações:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{ex.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop View: Table layout */}
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-left">
                                        <thead className="bg-brand-light">
                                            <tr>
                                                <th className="p-3 font-semibold w-1/4">Exercício</th>
                                                <th className="p-3 font-semibold w-1/4">Vídeo</th>
                                                <th className="p-3 font-semibold">Séries</th>
                                                <th className="p-3 font-semibold">Reps</th>
                                                <th className="p-3 font-semibold">Descanso</th>
                                                <th className="p-3 font-semibold">Observações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workout.exercises.map(ex => {
                                                const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);
                                                return (
                                                    <tr key={ex.id} className="border-t">
                                                        <td className="p-3 font-medium align-top">{ex.name}</td>
                                                        <td className="p-3 align-middle">
                                                            {embedUrl ? (
                                                                <iframe
                                                                    className="w-full max-w-[200px] aspect-video rounded-md shadow"
                                                                    src={embedUrl}
                                                                    title={ex.name}
                                                                    frameBorder="0"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                ></iframe>
                                                            ) : (
                                                                <span className="text-gray-400 text-sm">N/A</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 align-top">{ex.sets}</td>
                                                        <td className="p-3 align-top">{ex.reps}</td>
                                                        <td className="p-3 align-top">{ex.rest}</td>
                                                        <td className="p-3 text-sm text-gray-600 align-top whitespace-pre-wrap">{ex.notes}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <DumbbellIcon className="w-16 h-16 mx-auto text-gray-300"/>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">Nenhuma ficha de treino encontrada.</h3>
                        <p className="mt-2 text-gray-500">Peça ao seu personal para cadastrar seus treinos.</p>
                    </div>
                )}
            </main>
        </>
    );
};

export default WorkoutPortal;
