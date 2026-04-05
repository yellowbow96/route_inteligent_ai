import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function BikeProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    model: '',
    engine_cc: '',
    weight: '',
    wheel_diameter: '',
    tank_capacity: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/bike');
        if (res.data) setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/bike', profile);
      setMessage('Profile saved successfully! Redirecting to Dashboard...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage('Error saving profile');
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="min-h-screen p-8 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-neonBlue/10 rounded-full blur-[120px]" />
      
      <div className="max-w-2xl mx-auto bg-gray-800/60 p-8 border border-gray-700/50 rounded-2xl shadow-xl backdrop-blur-md relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-neonBlue">Your Bike Profile</h1>
        <p className="text-gray-400 mb-8 border-b border-gray-700 pb-4">
          Enter these details carefully. They are used to calculate accurate fuel consumption and physics data during your ride.
        </p>

        {message && <div className="mb-4 text-neonOrange font-semibold">{message}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Bike Model Name</label>
            <input type="text" 
                   value={profile.model} 
                   onChange={(e) => setProfile({...profile, model: e.target.value})} 
                   className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-neonBlue outline-none focus:ring-1 focus:ring-neonBlue transition-colors"
                   required placeholder="e.g. Yamaha R15 V4" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Engine Displacement (CC)</label>
            <input type="number" 
                   value={profile.engine_cc} 
                   onChange={(e) => setProfile({...profile, engine_cc: e.target.value})} 
                   className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-neonOrange outline-none transition-colors"
                   required placeholder="e.g. 155" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
            <input type="number" 
                   value={profile.weight} 
                   onChange={(e) => setProfile({...profile, weight: e.target.value})} 
                   className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-neonOrange outline-none transition-colors"
                   required placeholder="e.g. 142" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Wheel Diameter (inches)</label>
            <input type="number" 
                   value={profile.wheel_diameter} 
                   onChange={(e) => setProfile({...profile, wheel_diameter: e.target.value})} 
                   className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-neonOrange outline-none transition-colors"
                   required placeholder="e.g. 17" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fuel Tank Capacity (Liters)</label>
            <input type="number" 
                   value={profile.tank_capacity} 
                   onChange={(e) => setProfile({...profile, tank_capacity: e.target.value})} 
                   className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-neonOrange outline-none transition-colors"
                   required placeholder="e.g. 11" />
          </div>

          <div className="md:col-span-2 mt-4">
            <button type="submit" className="w-full bg-gray-100 text-gray-900 hover:bg-white font-bold py-3 rounded-lg transition-transform hover:scale-[1.01]">
              Save Profile Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BikeProfile;
