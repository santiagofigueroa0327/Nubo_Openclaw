"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, XCircleIcon, SaveIcon, RefreshIcon } from "@/components/ui/icons";
import { motion } from "framer-motion";
import Link from "next/link";

interface AgentConfig {
  agentId: string;
  name: string;
  role: string;
  description: string;
  enabled: boolean;
  model: string;
  fallbacks: string[];
  capabilities: string[];
  toolsAllow: string[];
  toolsDeny: string[];
  skills: string[];
}

export function AgentDetailClient({ initialAgentConfig }: { initialAgentConfig: AgentConfig }) {
  const router = useRouter();
  const [agent, setAgent] = useState(initialAgentConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch(`/api/agents/${agent.agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.name,
          role: agent.role,
          description: agent.description,
          enabled: agent.enabled,
          model: agent.model,
          fallbacks: agent.fallbacks,
          capabilities: agent.capabilities,
          toolsAllow: agent.toolsAllow,
          toolsDeny: agent.toolsDeny,
          skills: agent.skills,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save agent config");
      }
      
      setSaveSuccess(true);
      setIsRestarting(true); // Indicate gateway is restarting

      // Refresh the page after a delay to get new config (after gateway restarts)
      setTimeout(() => {
        router.refresh(); // Refreshes current route for new server component data
        setIsRestarting(false);
      }, 8000); // Give gateway 8 seconds to restart

    } catch (err) {
      setError(String(err));
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Utility to handle array changes (comma separated string)
  const handleArrayChange = (field: keyof AgentConfig, value: string) => {
    setAgent((prev) => ({ 
      ...prev, 
      [field]: value.split(',').map(s => s.trim()).filter(Boolean) 
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link href="/agents" className="text-sm text-muted hover:text-text transition-colors mb-4 block">
        &larr; Back to Agents
      </Link>
      <h1 className="text-2xl font-bold text-text mb-6">Configure Agent: {agent.name}</h1>

      <div className="space-y-4">
        {/* Agent ID */}
        <div className="flex items-center space-x-2">
          <label className="w-32 text-sm font-medium text-muted">ID:</label>
          <span className="flex-1 text-text p-2 bg-bg/50 border border-border rounded-lg text-sm font-mono">{agent.agentId}</span>
        </div>

        {/* Name */}
        <div className="flex items-center space-x-2">
          <label htmlFor="name" className="w-32 text-sm font-medium text-muted">Name:</label>
          <input
            type="text"
            id="name"
            value={agent.name}
            onChange={(e) => setAgent({ ...agent, name: e.target.value })}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Role */}
        <div className="flex items-center space-x-2">
          <label htmlFor="role" className="w-32 text-sm font-medium text-muted">Role:</label>
          <input
            type="text"
            id="role"
            value={agent.role}
            onChange={(e) => setAgent({ ...agent, role: e.target.value })}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Description */}
        <div className="flex items-center space-x-2">
          <label htmlFor="description" className="w-32 text-sm font-medium text-muted">Description:</label>
          <textarea
            id="description"
            value={agent.description}
            onChange={(e) => setAgent({ ...agent, description: e.target.value })}
            rows={3}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Enabled */}
        <div className="flex items-center space-x-2">
          <label htmlFor="enabled" className="w-32 text-sm font-medium text-muted">Enabled:</label>
          <input
            type="checkbox"
            id="enabled"
            checked={agent.enabled}
            onChange={(e) => setAgent({ ...agent, enabled: e.target.checked })}
            className="form-checkbox h-4 w-4 text-accent-cyan bg-bg border-border rounded focus:ring-accent-cyan/50"
          />
        </div>

        {/* Model */}
        <div className="flex items-center space-x-2">
          <label htmlFor="model" className="w-32 text-sm font-medium text-muted">Model:</label>
          <input
            type="text"
            id="model"
            value={agent.model}
            onChange={(e) => setAgent({ ...agent, model: e.target.value })}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Fallbacks */}
        <div className="flex items-center space-x-2">
          <label htmlFor="fallbacks" className="w-32 text-sm font-medium text-muted">Fallbacks (comma-separated):</label>
          <input
            type="text"
            id="fallbacks"
            value={agent.fallbacks.join(', ')}
            onChange={(e) => handleArrayChange('fallbacks', e.target.value)}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Capabilities */}
        <div className="flex items-center space-x-2">
          <label htmlFor="capabilities" className="w-32 text-sm font-medium text-muted">Capabilities (comma-separated):</label>
          <input
            type="text"
            id="capabilities"
            value={agent.capabilities.join(', ')}
            onChange={(e) => handleArrayChange('capabilities', e.target.value)}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Tools Allow */}
        <div className="flex items-center space-x-2">
          <label htmlFor="toolsAllow" className="w-32 text-sm font-medium text-muted">Tools (Allow, comma-separated):</label>
          <input
            type="text"
            id="toolsAllow"
            value={agent.toolsAllow.join(', ')}
            onChange={(e) => handleArrayChange('toolsAllow', e.target.value)}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Tools Deny */}
        <div className="flex items-center space-x-2">
          <label htmlFor="toolsDeny" className="w-32 text-sm font-medium text-muted">Tools (Deny, comma-separated):</label>
          <input
            type="text"
            id="toolsDeny"
            value={agent.toolsDeny.join(', ')}
            onChange={(e) => handleArrayChange('toolsDeny', e.target.value)}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Skills */}
        <div className="flex items-center space-x-2">
          <label htmlFor="skills" className="w-32 text-sm font-medium text-muted">Skills (comma-separated):</label>
          <input
            type="text"
            id="skills"
            value={agent.skills.join(', ')}
            onChange={(e) => handleArrayChange('skills', e.target.value)}
            className="flex-1 p-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent-cyan/50"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end space-x-2 pt-4">
          {isRestarting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-accent-cyan"
            >
              <RefreshIcon className="w-4 h-4 animate-spin" />
              <span>Gateway restarting (8s)...</span>
            </motion.div>
          )}
          {error && (
            <span className="text-red-400 text-sm">Error: {error}</span>
          )}
          {saveSuccess === true && !isRestarting && (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" /> Saved!
            </span>
          )}
          {saveSuccess === false && !error && (
            <span className="text-red-400 text-sm flex items-center gap-1">
              <XCircleIcon className="w-4 h-4" /> Failed!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || isRestarting}
            className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/80 text-white rounded-lg hover:bg-accent-cyan transition-colors disabled:opacity-50"
          >
            <SaveIcon className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
