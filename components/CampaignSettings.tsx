
import React, { useState } from 'react';
import { CampaignConfig } from '../types';

interface CampaignSettingsProps {
}

const CampaignSettings: React.FC<CampaignSettingsProps> = () => {
  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fb] p-8 space-y-8 animate-fadeIn">
      <header className="flex items-center justify-between border-b-2 border-[#111827] pb-5">
        <div>
          <h2 className="text-lg font-bold text-[#111827] uppercase tracking-tight">Account Settings</h2>
          <p className="text-[10px] text-[#6b7280] font-bold uppercase tracking-widest mt-1">Manage Your Profile and Integrations</p>
        </div>
      </header>

      <section className="bg-white border border-[#e5e7eb] shadow-sm lg:col-span-2">
        <div className="p-4 bg-[#f8f9fb] border-b border-[#e5e7eb]">
          <h3 className="text-[11px] font-bold text-[#111827] uppercase tracking-wide">External Integrations</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 border border-[#e5e7eb] rounded-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white border border-[#e5e7eb] flex items-center justify-center rounded-sm">
                <i className="fab fa-google text-lg text-[#ea4335]"></i>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-[#111827] uppercase">Google Calendar</h4>
                <p className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider">Sync booked appointments directly to your personal calendar.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = 'https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/google-auth'}
              className="px-4 py-2 bg-white border border-[#d1d5db] text-[#374151] text-[10px] font-bold uppercase hover:bg-[#f9fafb] flex items-center gap-2"
            >
              <i className="fas fa-link text-[#6b7280]"></i>
              Connect Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CampaignSettings;
