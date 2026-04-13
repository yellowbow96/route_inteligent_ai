import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BikeProfileForm from '../components/BikeProfileForm';

const emptyProfile = {
  model_name: '',
  engine_cc: '',
  weight: '',
  wheel_diameter: '',
  tank_capacity: ''
};

const normalizeBikeProfile = (data = {}) => ({
  model_name: data.model_name || [data.brand, data.model, data.year].filter(Boolean).join(' ') || '',
  engine_cc: data.engine_cc?.toString?.() || '',
  weight: data.weight?.toString?.() || '',
  wheel_diameter: data.wheel_diameter?.toString?.() || '',
  tank_capacity: data.tank_capacity?.toString?.() || ''
});

function BikeProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/bike/');
        if (res.data) setProfile(normalizeBikeProfile(res.data));
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
      const payload = {
        model_name: profile.model_name,
        engine_cc: parseInt(profile.engine_cc),
        weight: parseInt(profile.weight),
        wheel_diameter: parseInt(profile.wheel_diameter),
        tank_capacity: parseInt(profile.tank_capacity)
      };
      await axios.post('/api/bike/', payload);
      setMessage('✅ Profile saved successfully! Redirecting to Dashboard...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error(err);
      setMessage('❌ Error saving profile. Please check if all values are valid.');
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
        <BikeProfileForm
          profile={profile}
          onChange={setProfile}
          onSubmit={handleSubmit}
          submitLabel="Save Profile Configurations"
          message={message}
        />
      </div>
    </div>
  );
}

export default BikeProfile;
