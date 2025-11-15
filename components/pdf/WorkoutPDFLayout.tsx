import React from 'react';
import { Student, Trainer, Workout, ExerciseSet } from '../../types';

interface Props {
  student: Student;
  trainer: Trainer;
  workout: Workout;
}

const renderSetDetailsPDF = (set: ExerciseSet): string => {
    switch(set.type) {
        case 'reps_load': return `${set.reps || '-'} reps @ ${set.load || '-'}`;
        case 'reps_load_time': return `${set.reps || '-'} reps @ ${set.load || '-'} [${set.time || '-'}]`;
        case 'reps_time': return `${set.reps || '-'} reps [${set.time || '-'}]`;
        case 'run': return `${set.distance || '-'} em ${set.time || '-'}`;
        case 'cadence': return `Cadência ${set.cadence || '-'} | ${set.reps || '-'} reps @ ${set.load || '-'}`;
        case 'observation': return `${set.observation || '-'}`;
        default: return '';
    }
};

const WorkoutPDFLayout = React.forwardRef<HTMLDivElement, Props>(({ student, trainer, workout }, ref) => {
  return (
    <div ref={ref} style={{ width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#091e42' }}>{workout.title}</h1>
      </header>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '20px' }}>
          <p><strong>Aluno(a):</strong> {student.name}</p>
          <p><strong>Personal:</strong> {trainer.fullName || trainer.username}</p>
      </div>
      <main>
        {(workout.exercises || []).filter(ex => !ex.isHidden).map((ex, index) => (
          <div key={ex.id} style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', backgroundColor: '#f4f5f7', padding: '8px', border: '1px solid #ddd', borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{ex.name}</h2>
              <p style={{ fontSize: '12px', margin: 0 }}><strong>Descanso:</strong> {ex.rest || '-'}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>Série</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {(ex.sets || []).map((set, setIndex) => (
                  <tr key={set.id} style={{ backgroundColor: setIndex % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{setIndex + 1}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{renderSetDetailsPDF(set)}</td>
                  </tr>
                ))}
                 {ex.sets.length === 0 && (
                    <tr>
                        <td colSpan={2} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontStyle: 'italic', color: '#777' }}>Nenhuma série cadastrada.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </main>
      <footer style={{ position: 'absolute', bottom: '15mm', fontSize: '10px', color: '#777', width: 'calc(100% - 40mm)', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} por Personal Trainer Dashboard</p>
      </footer>
    </div>
  );
});

export default WorkoutPDFLayout;