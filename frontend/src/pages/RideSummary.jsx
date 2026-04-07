import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Share2, ArrowLeft, Navigation, Activity, DollarSign, TrendingDown } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip);

function RideSummary() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const summary = state || {
    distance: 0, duration: 0, average_speed: 0, fuel_used: 0, score: 80, tripCost: 0,
    aiInsight: "Data unavailable.", speedHistory: []
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-neonBlue';
    if (score >= 50) return 'text-neonOrange';
    return 'text-red-500';
  };

  const getHighlightMessage = (score) => {
    if (score >= 95) return "🏆 Best Ride This Week!";
    if (score >= 80) return "🔥 Solid Performance";
    if (score >= 60) return "⚠️ Needs Improvement";
    return "🚨 High Risk Riding Warning";
  };

  const chartData = {
    labels: summary.speedHistory?.map(s => `${s.time}s`) || [],
    datasets: [
      {
        label: 'Speed Profile (km/h)',
        data: summary.speedHistory?.map(s => s.speed) || [],
        borderColor: '#00f3ff',
        backgroundColor: 'rgba(0, 243, 255, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: summary.speedHistory?.map(s => {
          if (s.event === 'overspeed') return '#ef4444';
          if (s.event === 'braking') return '#eab308';
          return 'transparent';
        }) || [],
        pointRadius: summary.speedHistory?.map(s => s.event ? 6 : 0) || []
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const dataPt = summary.speedHistory[ctx.dataIndex];
            if (dataPt.event) return `${Math.round(dataPt.speed)} km/h - ${dataPt.event.toUpperCase()}`;
            return `${Math.round(dataPt.speed)} km/h`;
          }
        }
      }
    },
    scales: {
      y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
      x: { ticks: { color: '#9ca3af', maxTicksLimit: 10 }, grid: { display: false } }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-gray-100 p-6 md:p-12 relative overflow-y-auto">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-neonBlue/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-500 text-transparent bg-clip-text mb-2">
              RIDE COMPLETED
            </h1>
            <div className={`text-xl font-bold bg-gray-800/80 inline-block px-4 py-2 rounded-full border border-gray-700 ${summary.score>=80?'text-green-400':'text-neonOrange'}`}>
              {getHighlightMessage(summary.score)}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 text-right">
             <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Trip Cost</div>
             <div className="text-4xl font-black text-neonOrange">
               ₹{summary.tripCost?.toFixed(2)}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Main Score Card */}
          <div className="lg:col-span-1 bg-gray-800/80 border border-gray-700 rounded-3xl p-8 shadow-2xl flex flex-col justify-center items-center relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-b ${summary.score >= 80 ? 'from-green-500/10' : 'from-red-500/10'} to-transparent`} />
            <h2 className="text-lg text-gray-400 font-bold tracking-wider mb-2 relative z-10">RIDER SCORE</h2>
            <div className={`text-8xl font-black mb-4 relative z-10 ${getScoreColor(summary.score)} drop-shadow-[0_0_20px_rgba(currentcolor,0.3)]`}>
              {summary.score}
            </div>
            <p className="text-gray-300 font-semibold flex items-center justify-center space-x-2 relative z-10">
              <Activity className="w-4 h-4" /> <span>{summary.score >= 80 ? 'Optimal' : summary.score >= 60 ? 'Average' : 'High Risk'}</span>
            </p>
          </div>

          {/* Stats Grid */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Distance', val: summary.distance.toFixed(1), unit: 'km' },
              { label: 'Avg Speed', val: summary.average_speed.toFixed(1), unit: 'km/h' },
              { label: 'Top Speed', val: Math.max(...(summary.speedHistory?.map(s=>s.speed)|| [0])).toFixed(0), unit: 'km/h' },
              { label: 'Fuel Used', val: summary.fuel_used.toFixed(2), unit: 'L' }
            ].map(s => (
               <div key={s.label} className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl shadow-xl flex flex-col justify-center">
                 <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{s.label}</div>
                 <div className="text-3xl font-bold text-white flex items-baseline">
                   {s.val} <span className="text-sm text-gray-500 ml-1">{s.unit}</span>
                 </div>
               </div>
            ))}

            {/* AI Insight Card takes up remaining cols */}
            <div className="col-span-2 lg:col-span-4 bg-gradient-to-r from-neonBlue/10 to-transparent border border-neonBlue/30 rounded-2xl p-6 shadow-xl flex items-start">
               <Navigation className="w-6 h-6 mr-4 text-neonBlue shrink-0 mt-1" />
               <div>
                  <h3 className="text-sm font-bold text-neonBlue mb-1 uppercase tracking-wider">Predictive Insights</h3>
                  <p className="text-gray-300 leading-relaxed font-medium">
                    {summary.aiInsight}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Behavior Timeline */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-3xl p-6 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <TrendingDown className="w-5 h-5 mr-3 text-neonOrange" /> Rider Behavior Timeline
            </h3>
            <div className="flex space-x-4 text-xs font-bold">
              <span className="flex items-center text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Overspeed</span>
              <span className="flex items-center text-yellow-500"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Heavy Braking</span>
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {summary.speedHistory && summary.speedHistory.length > 0 ? (
               <Line options={chartOptions} data={chartData} />
            ) : (
               <div className="absolute inset-0 flex items-center justify-center text-gray-500">Timeline data not available</div>
            )}
          </div>
        </div>

        <button className="w-full py-4 bg-neonBlue/10 hover:bg-neonBlue/20 text-neonBlue border border-neonBlue border-opacity-50 rounded-xl font-black transition-all flex items-center justify-center tracking-wider">
          <Share2 className="w-5 h-5 mr-3" /> SHARE TRIP REPORT
        </button>
      </div>
    </div>
  );
}

export default RideSummary;
