import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, MapPin } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function RideHistory() {
  const [rides, setRides] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await axios.get('/api/rides/');
        setRides(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRides();
  }, []);

  const chartData = {
    labels: rides.map((r, i) => `Ride ${rides.length - i}`).reverse(),
    datasets: [
      {
        label: 'Rider Score',
        data: rides.map(r => r.rider_score).reverse(),
        borderColor: '#00f3ff',
        backgroundColor: 'rgba(0, 243, 255, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Fuel Used (L)',
        data: rides.map(r => r.fuel_used).reverse(),
        borderColor: '#ff6b00',
        backgroundColor: 'rgba(255, 107, 0, 0.5)',
        tension: 0.3,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#fff' } },
      title: { display: true, text: 'Rider Performance Overview', color: '#fff' },
    },
    scales: {
      y: { ticks: { color: '#9ca3af' } },
      x: { ticks: { color: '#9ca3af' } }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-neonOrange/10 rounded-full blur-[120px]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center text-neonBlue hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">Ride History & Analytics</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-xl backdrop-blur-md">
             {rides.length > 0 ? <Line options={chartOptions} data={chartData} /> : <p className="text-gray-400">No rides yet.</p>}
          </div>

          <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
            <h3 className="text-xl font-bold text-neonBlue sticky top-0 bg-gray-900/90 py-2 backdrop-blur-sm">Recent Rides</h3>
            {rides.length === 0 && <p className="text-gray-400">Your past rides will appear here.</p>}
            {rides.map(ride => (
              <div key={ride.id} className="bg-gray-800 border border-gray-700/50 p-4 rounded-xl hover:border-neonBlue/50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-gray-300 text-sm flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {new Date(ride.date).toLocaleDateString()}
                  </div>
                  <div className={`font-bold ${ride.rider_score >= 80 ? 'text-green-500' : 'text-neonOrange'}`}>
                    Score: {ride.rider_score}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {ride.distance.toFixed(1)} km</div>
                  <div className="flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> {ride.average_speed.toFixed(1)} km/h</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

export default RideHistory;
