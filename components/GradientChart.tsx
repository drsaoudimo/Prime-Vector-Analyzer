import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GradientPoint } from '../types';

interface GradientChartProps {
  data: GradientPoint[];
}

export const GradientChart: React.FC<GradientChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="x" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Area 
            type="monotone" 
            dataKey="potential" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorPotential)" 
            name="Potential"
          />
          <Area 
            type="monotone" 
            dataKey="gradient" 
            stroke="#f43f5e" 
            fillOpacity={1} 
            fill="url(#colorGradient)" 
            name="Gradient (∇)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};