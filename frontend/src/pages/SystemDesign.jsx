import React, { useState } from 'react';
import { ArrowLeft, Database, Server, Smartphone, Shield, Map, Zap, Cpu, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function SystemDesign() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dfd0');

  return (
    <div className="min-h-screen bg-[#0f111a] text-gray-100 p-6 md:p-12 relative overflow-y-auto">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-neonBlue/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Application
        </button>

        <h1 className="text-4xl font-black bg-gradient-to-r from-neonBlue to-neonOrange text-transparent bg-clip-text mb-2">
          SYSTEM ARCHITECTURE
        </h1>
        <p className="text-gray-400 font-bold tracking-wider mb-8 uppercase text-sm">
          Python FastAPI • MongoDB • Express React • Formal DSA
        </p>

        <div className="flex space-x-4 mb-8">
          {[
            { id: 'dfd0', label: 'DFD Level 0' },
            { id: 'dfd1', label: 'DFD Level 1' },
            { id: 'er', label: 'ER Diagram' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                activeTab === t.id 
                  ? 'bg-neonBlue text-gray-900 shadow-[0_0_20px_rgba(0,243,255,0.4)]' 
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-800/80 border border-gray-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
          
          {activeTab === 'dfd0' && (
            <div className="w-full flex justify-center">
                <div className="text-center w-full">
                    <h3 className="text-xl font-bold mb-12 text-neonBlue">Data Flow Diagram - Level 0</h3>
                    <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-12">
                        
                        <div className="bg-gray-700 p-6 rounded-xl border border-gray-600 flex flex-col items-center">
                            <Smartphone className="w-12 h-12 text-neonOrange mb-3" />
                            <h4 className="font-bold">User / Rider</h4>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="text-xs text-neonBlue font-bold">Input (Credentials, Origin, Dest)</div>
                            <div className="w-16 h-1 bg-neonBlue relative flex items-center justify-center">
                                <div className="absolute right-0 w-3 h-3 border-t-2 border-r-2 border-neonBlue transform rotate-45 translate-x-1"></div>
                            </div>
                            <div className="w-16 h-1 bg-neonOrange relative flex items-center justify-center">
                                <div className="absolute left-0 w-3 h-3 border-b-2 border-l-2 border-neonOrange transform rotate-45 -translate-x-1"></div>
                            </div>
                            <div className="text-xs text-neonOrange font-bold">Output (Optimized Route, Alerts)</div>
                        </div>

                        <div className="bg-blue-900/50 p-8 rounded-[50%] border-4 border-neonBlue flex flex-col items-center shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                            <Cpu className="w-16 h-16 text-white mb-3" />
                            <h4 className="font-bold text-xl">Rider Intelligence</h4>
                            <p className="text-xs text-gray-300">FastAPI V3 System</p>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-16 h-1 bg-gray-500 relative flex items-center justify-center">
                                <div className="absolute right-0 w-3 h-3 border-t-2 border-r-2 border-gray-500 transform rotate-45 translate-x-1"></div>
                            </div>
                            <div className="text-xs text-gray-400 font-bold">API Requests</div>
                        </div>

                        <div className="bg-gray-700 p-6 rounded-xl border border-gray-600 flex flex-col items-center">
                            <Server className="w-12 h-12 text-green-400 mb-3" />
                            <h4 className="font-bold">External APIs</h4>
                            <p className="text-xs text-gray-400">(ORS, Weather)</p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'dfd1' && (
            <div className="w-full">
                <h3 className="text-xl font-bold mb-8 text-neonOrange text-center">Data Flow Diagram - Level 1 (Internal Services)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                   <div className="p-6 border border-gray-700 bg-gray-900 rounded-xl relative z-10">
                       <h4 className="font-bold text-lg mb-2 flex items-center"><Shield className="w-5 h-5 mr-2 text-neonBlue"/> 1.0 Auth System</h4>
                       <p className="text-sm text-gray-400 mb-4">Validates JWT tokens. Communicates heavily with Hash Maps for session storing.</p>
                       <div className="bg-gray-800 p-2 rounded text-xs text-center border-l-2 border-neonBlue">Users Collection</div>
                   </div>

                   <div className="p-6 border border-gray-700 bg-gray-900 rounded-xl relative z-10">
                       <h4 className="font-bold text-lg mb-2 flex items-center"><Route className="w-5 h-5 mr-2 text-neonOrange"/> 2.0 Route Planning Engine</h4>
                       <p className="text-sm text-gray-400 mb-4">Takes geo-coords. Runs <strong className="text-neonBlue">Dijkstra Algorithm</strong> and <strong className="text-neonOrange">Greedy Algorithm</strong> for logic.</p>
                       <div className="grid grid-cols-2 gap-2">
                           <div className="bg-gray-800 p-2 rounded text-xs text-center border-l-2 border-gray-500">Route Cache Hash</div>
                           <div className="bg-gray-800 p-2 rounded text-xs text-center border-l-2 border-green-500">ORS External API</div>
                       </div>
                   </div>

                   <div className="p-6 border border-gray-700 bg-gray-900 rounded-xl relative z-10">
                       <h4 className="font-bold text-lg mb-2 flex items-center"><Map className="w-5 h-5 mr-2 text-yellow-500"/> 3.0 Smart POI Engine</h4>
                       <p className="text-sm text-gray-400 mb-4">Fetches places. Operates <strong className="text-yellow-500">Quick Sort Algorithm</strong> based on calculated distances and rating matrices.</p>
                   </div>

                   <div className="p-6 border border-gray-700 bg-gray-900 rounded-xl relative z-10">
                       <h4 className="font-bold text-lg mb-2 flex items-center"><Zap className="w-5 h-5 mr-2 text-purple-500"/> 4.0 AI Insights Engine</h4>
                       <p className="text-sm text-gray-400 mb-4">Scans trajectory log array. Analyzes harsh braking bounds and determines fuel consumption rate drops.</p>
                       <div className="bg-gray-800 p-2 rounded text-xs text-center border-l-2 border-purple-500">Rides Collection Database</div>
                   </div>
                </div>
            </div>
          )}

          {activeTab === 'er' && (
            <div className="w-full flex justify-center">
                <div className="text-center max-w-3xl">
                    <h3 className="text-xl font-bold mb-8 text-green-400 text-center flex justify-center items-center"><Database className="mr-3"/> ER Diagram (MongoDB Structure)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="bg-gray-800 border-2 border-neonBlue rounded-xl overflow-hidden shadow-lg">
                            <div className="bg-neonBlue text-gray-900 font-bold p-2 text-sm">USER</div>
                            <div className="p-4 text-left text-xs font-mono space-y-2 text-gray-300">
                                <div><span className="text-yellow-400">PK</span> _id: ObjectId</div>
                                <div>username: String</div>
                                <div>password: Hash</div>
                                <div>createdAt: Date</div>
                            </div>
                        </div>

                        <div className="relative flex justify-center items-center">
                             <div className="text-neonBlue text-xs font-bold bg-gray-900 px-2 py-1 rounded-full border border-gray-700 absolute z-10">1 : 1</div>
                             <div className="w-full h-1 bg-gray-700"></div>
                        </div>

                        <div className="bg-gray-800 border-2 border-purple-500 rounded-xl overflow-hidden shadow-lg transform translate-y-8">
                            <div className="bg-purple-500 text-white font-bold p-2 text-sm">BIKE PROFILE</div>
                            <div className="p-4 text-left text-xs font-mono space-y-2 text-gray-300">
                                <div><span className="text-neonBlue">FK</span> userId: ObjectId</div>
                                <div>model_name: String</div>
                                <div>engine_cc: Int</div>
                                <div>weight: Int</div>
                                <div>tank_capacity: Int</div>
                            </div>
                        </div>

                        <div className="relative flex justify-center items-center md:col-start-1 md:col-end-2">
                             <div className="text-neonOrange text-xs font-bold bg-gray-900 px-2 py-1 rounded-full border border-gray-700 absolute z-10">1 : N</div>
                             <div className="w-1 h-12 bg-gray-700"></div>
                        </div>

                        <div className="bg-gray-800 border-2 border-neonOrange rounded-xl overflow-hidden shadow-lg md:col-start-1 md:col-end-4 mt-6">
                            <div className="bg-neonOrange text-white font-bold p-2 text-sm">RIDE LOG</div>
                            <div className="p-4 text-left text-xs font-mono space-y-2 text-gray-300 grid grid-cols-2 gap-2">
                                <div><span className="text-yellow-400">PK</span> _id: ObjectId</div>
                                <div><span className="text-neonBlue">FK</span> userId: ObjectId</div>
                                <div>date: Date</div>
                                <div>distance: Float</div>
                                <div>duration: Float</div>
                                <div>average_speed: Float</div>
                                <div>fuel_used: Float</div>
                                <div>rider_score: Float</div>
                                <div>route_data: Array[GeoCoords]</div>
                                <div>speedHistory: Array[Objects]</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default SystemDesign;
