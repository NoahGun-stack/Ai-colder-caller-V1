
import React, { useState } from 'react';
import { CampaignConfig } from '../types';

interface CampaignConfiguratorProps {
    selectedCampaign?: 'residential' | 'b2b' | 'staffing' | 'real_estate';
    setSelectedCampaign?: (campaign: 'residential' | 'b2b' | 'staffing' | 'real_estate') => void;
}

export const CampaignConfigurator: React.FC<CampaignConfiguratorProps> = ({ selectedCampaign = 'residential', setSelectedCampaign }) => {
    const [config, setConfig] = useState<CampaignConfig>({
        name: 'OUTBOUND_ROOF_001',
        isActive: true,
        callingHours: { start: '09:00', end: '18:00' },
        tone: 'Direct',
        voicemailMessage: 'OUTBOUND OUTREACH FROM ROOFPULSE OPERATIONS. PROPERTY INSPECTION ADVISORY. CALL 888-555-0199.'
    });

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between border-b-2 border-[#111827] pb-5">
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">System Infrastructure</h2>
                    <p className="text-[10px] text-[#d1d5db] font-bold uppercase tracking-widest mt-1">Operational Configuration for Calling Agents</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2 border border-[#404040] text-[11px] font-bold uppercase text-white bg-[#080808]">Discard</button>
                    <button className="px-8 py-2 bg-[#111827] text-white text-[11px] font-bold uppercase">Commit Configuration</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-[#080808] border border-[#404040] shadow-sm">
                    <div className="p-4 bg-[#1a1a1a] border-b border-[#404040]">
                        <h3 className="text-[11px] font-bold text-white uppercase">Deployment Parameters</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-[#d1d5db] uppercase mb-2">Campaign Identifier</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-[#404040] text-[12px] font-bold uppercase outline-none focus:border-[#d4a843]"
                                value={config.name}
                                onChange={e => setConfig({ ...config, name: e.target.value.toUpperCase() })}
                            />
                        </div>

                        {/* Standard Active Toggle */}
                        <div className="flex items-center justify-between p-4 border border-[#f3f4f6] bg-[#1a1a1a]">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-white uppercase">Agent Signal Override</p>
                                <p className="text-[9px] text-[#d1d5db] uppercase font-bold">Global Master Control for Outbound Routes</p>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                                className={`w-10 h-5 flex items-center p-0.5 border transition-colors ${config.isActive ? 'bg-green-600 border-green-800' : 'bg-[#d1d5db] border-[#666666]'}`}
                            >
                                <div className={`w-3 h-3 bg-[#080808] shadow-sm transition-transform ${config.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        {/* Hidden Campaign Selector */}
                        {setSelectedCampaign && (
                            <div className="p-4 border border-[#404040] bg-[#1a1a1a] space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-white uppercase">Active Persona Protocol</p>
                                    <p className="text-[9px] text-[#d4a843] uppercase font-bold">Select Global Agent Configuration (Admin Only)</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedCampaign('residential')}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all ${selectedCampaign === 'residential' ? 'bg-[#d4a843] text-white border border-indigo-800' : 'bg-[#080808] text-[#d1d5db] border border-[#404040]'}`}
                                    >
                                        Residential
                                    </button>
                                    <button
                                        onClick={() => setSelectedCampaign('b2b')}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all ${selectedCampaign === 'b2b' ? 'bg-[#d4a843] text-white border border-indigo-800' : 'bg-[#080808] text-[#d1d5db] border border-[#404040]'}`}
                                    >
                                        B2B Sales
                                    </button>
                                    <button
                                        onClick={() => setSelectedCampaign('staffing')}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all ${selectedCampaign === 'staffing' ? 'bg-orange-500 text-white border border-orange-700' : 'bg-[#080808] text-[#d1d5db] border border-[#404040]'}`}
                                    >
                                        Staffing
                                    </button>
                                    <button
                                        onClick={() => setSelectedCampaign('real_estate')}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all ${selectedCampaign === 'real_estate' ? 'bg-green-600 text-white border border-green-800' : 'bg-[#080808] text-[#d1d5db] border border-[#404040]'}`}
                                    >
                                        Home Buyer
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </section>

                <section className="bg-[#080808] border border-[#404040] shadow-sm">
                    <div className="p-4 bg-[#1a1a1a] border-b border-[#404040]">
                        <h3 className="text-[11px] font-bold text-white uppercase">Window Constraints</h3>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-[#d1d5db] uppercase mb-2">Daily Commencement</label>
                            <input type="time" className="w-full px-4 py-2 border border-[#404040] text-[12px] font-bold outline-none focus:border-[#d4a843]" value={config.callingHours.start} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#d1d5db] uppercase mb-2">Daily Termination</label>
                            <input type="time" className="w-full px-4 py-2 border border-[#404040] text-[12px] font-bold outline-none focus:border-[#d4a843]" value={config.callingHours.end} />
                        </div>
                    </div>
                    <div className="px-6 pb-6 text-[9px] text-[#d1d5db] font-bold uppercase leading-relaxed border-t border-[#f3f4f6] pt-4">
                        Compliance Note: System firmware automatically suppresses signals outside of 08:00 - 21:00 local endpoint time as per federal regulatory policy.
                    </div>
                </section>

                <section className="bg-[#080808] border border-[#404040] shadow-sm lg:col-span-2">
                    <div className="p-4 bg-[#1a1a1a] border-b border-[#404040]">
                        <h3 className="text-[11px] font-bold text-white uppercase tracking-wide">AI Agent Directive Profile</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-[#d1d5db] uppercase tracking-widest">Vocal profile tone</label>
                            <div className="flex flex-col border border-[#404040]">
                                {['Friendly', 'Direct', 'Conservative'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setConfig({ ...config, tone: t as any })}
                                        className={`px-4 py-3 text-[10px] font-bold uppercase text-left transition-all border-b last:border-b-0 ${config.tone === t
                                            ? 'bg-[#111827] text-white'
                                            : 'bg-[#080808] text-[#d1d5db] hover:bg-[#f5f7ff]'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <label className="block text-[10px] font-black text-[#d1d5db] uppercase tracking-widest">Voicemail Directive (VM Payload)</label>
                            <textarea
                                rows={5}
                                className="w-full px-5 py-4 border border-[#404040] text-[11px] font-bold text-white outline-none focus:border-[#d4a843] resize-none uppercase leading-relaxed tracking-tighter"
                                value={config.voicemailMessage}
                                onChange={e => setConfig({ ...config, voicemailMessage: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
