import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SpectralPoint } from '../types';

interface SpectralChartProps {
  data: SpectralPoint[];
}

export const SpectralChart: React.FC<SpectralChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
          <XAxis 
            dataKey="index" 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
            cursor={{ fill: '#334155', opacity: 0.4 }}
          />
          <Bar dataKey="value" name="Eigenvalue">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.type === 'Eigen' ? '#38bdf8' : '#334155'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};