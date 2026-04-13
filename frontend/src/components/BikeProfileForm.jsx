import React from 'react';

const emptyProfile = {
  model_name: '',
  engine_cc: '',
  weight: '',
  wheel_diameter: '',
  tank_capacity: ''
};

function BikeProfileForm({
  profile,
  onChange,
  onSubmit,
  submitLabel = 'Save Profile',
  message = '',
  compact = false,
}) {
  const updateField = (field, value) => {
    onChange({ ...profile, [field]: value });
  };

  const shellClass = compact
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-6';

  const inputClass =
    'w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none transition-colors focus:border-neonBlue focus:ring-1 focus:ring-neonBlue';

  return (
    <form onSubmit={onSubmit} className={shellClass}>
      {message && <div className="md:col-span-2 text-sm font-semibold text-neonOrange">{message}</div>}

      <div className={compact ? '' : 'md:col-span-2'}>
        <label className="block text-sm text-gray-400 mb-1">Bike Model Name</label>
        <input
          type="text"
          value={profile?.model_name ?? emptyProfile.model_name}
          onChange={(e) => updateField('model_name', e.target.value)}
          className={inputClass}
          required
          placeholder="e.g. Yamaha R15 V4"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Engine Displacement (CC)</label>
        <input
          type="number"
          value={profile?.engine_cc ?? emptyProfile.engine_cc}
          onChange={(e) => updateField('engine_cc', e.target.value)}
          className={inputClass}
          required
          placeholder="e.g. 155"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
        <input
          type="number"
          value={profile?.weight ?? emptyProfile.weight}
          onChange={(e) => updateField('weight', e.target.value)}
          className={inputClass}
          required
          placeholder="e.g. 142"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Wheel Diameter (inches)</label>
        <input
          type="number"
          value={profile?.wheel_diameter ?? emptyProfile.wheel_diameter}
          onChange={(e) => updateField('wheel_diameter', e.target.value)}
          className={inputClass}
          required
          placeholder="e.g. 17"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Fuel Tank Capacity (Liters)</label>
        <input
          type="number"
          value={profile?.tank_capacity ?? emptyProfile.tank_capacity}
          onChange={(e) => updateField('tank_capacity', e.target.value)}
          className={inputClass}
          required
          placeholder="e.g. 11"
        />
      </div>

      <div className={compact ? '' : 'md:col-span-2'}>
        <button
          type="submit"
          className="w-full bg-gray-100 text-gray-900 hover:bg-white font-bold py-3 rounded-lg transition-transform hover:scale-[1.01]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default BikeProfileForm;
