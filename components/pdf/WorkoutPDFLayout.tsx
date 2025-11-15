import React from 'react';
import { Student, Trainer, Workout } from '../../types';

interface Props {
  student: Student;
  trainer: Trainer;
  workout: Workout;
}

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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead style={{ backgroundColor: '#f4f5f7' }}>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Exercício</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>Séries</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>Reps</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>Descanso</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Observações</th>
            </tr>
          </thead>
          <tbody>
            {(workout.exercises || []).filter(ex => !ex.isHidden).map((ex, index) => (
              <tr key={ex.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{ex.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{ex.sets || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{ex.reps || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{ex.rest || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', whiteSpace: 'pre-wrap' }}>{ex.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <footer style={{ position: 'absolute', bottom: '15mm', fontSize: '10px', color: '#777', width: 'calc(100% - 40mm)', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} por Personal Trainer Dashboard</p>
      </footer>
    </div>
  );
});

export default WorkoutPDFLayout;