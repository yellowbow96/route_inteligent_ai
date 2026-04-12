import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MapPin, Fuel, Gauge, Users, Radio } from 'lucide-react';

function GroupLive() {
  const { code } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;

    const load = async () => {
      try {
        const res = await axios.get(`/api/group/live/${code}`);
        setSession(res.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load live group view');
      }
    };

    load();
    timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [code]);

  return (
    <div className="min-h-screen bg-[#081018] text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold tracking-[0.28em] uppercase text-cyan-300">
            <Radio className="w-4 h-4 mr-2" /> Live Ride Share
          </div>
          <h1 className="text-4xl font-black mt-4">Group {code}</h1>
          <p className="text-slate-400 mt-2">Public live ride view with rider positions, fuel bars, and recent walkie-talkie updates.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            {error}
          </div>
        )}

        {session && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black flex items-center">
                  <Users className="w-5 h-5 mr-3 text-cyan-300" /> Riders Live
                </h2>
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{session.members.length} members</span>
              </div>
              <div className="space-y-4">
                {session.members.map((member) => {
                  const fuelPct = member.fuel_capacity > 0 ? Math.max(0, Math.min(100, (member.fuel_remaining / member.fuel_capacity) * 100)) : 0;
                  return (
                    <div key={member.user_id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <div className="text-lg font-black">{member.display_name}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">{member.ride_mode}</div>
                        </div>
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${member.is_online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>
                          {member.is_online ? 'Online' : 'Offline'}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-slate-400 text-xs mb-1 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5" /> Location</div>
                          <div>{Number(member.lat || 0).toFixed(4)}, {Number(member.lon || 0).toFixed(4)}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-slate-400 text-xs mb-1 flex items-center"><Gauge className="w-3.5 h-3.5 mr-1.5" /> Speed</div>
                          <div>{Number(member.speed || 0).toFixed(0)} km/h</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-slate-400 text-xs mb-1 flex items-center"><Fuel className="w-3.5 h-3.5 mr-1.5" /> Fuel</div>
                          <div>{Number(member.fuel_remaining || 0).toFixed(1)} / {Number(member.fuel_capacity || 0).toFixed(1)} L</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${fuelPct > 50 ? 'bg-emerald-400' : fuelPct > 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${fuelPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-black mb-5 flex items-center">
                <Radio className="w-5 h-5 mr-3 text-orange-300" /> Walkie-Talkie Feed
              </h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {session.messages.map((message, idx) => (
                  <div key={`${message.timestamp}-${idx}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="font-bold">{message.display_name}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{message.source}</div>
                    </div>
                    <div className="text-sm text-slate-200">{message.message}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupLive;
