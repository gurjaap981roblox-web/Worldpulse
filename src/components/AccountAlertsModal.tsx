import React, { useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  Database,
  LogIn,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { AppSettings, CustomAlertRule, Topic } from '../types';
import { ALL_TOPICS, COUNTRY_GAZETTEER } from '../utils/sanitize';
import {
  savePushSubscriptionToSupabase,
  signInWithEmailMagicLink,
  signInWithGoogle,
  signOutSupabase,
  SUPABASE_RLS_SQL_SCRIPT,
} from '../services/supabase';

interface AccountAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  alertRules: CustomAlertRule[];
  onUpdateAlertRules: (rules: CustomAlertRule[]) => void;
  settings: AppSettings;
}

export const AccountAlertsModal: React.FC<AccountAlertsModalProps> = ({
  isOpen,
  onClose,
  user,
  alertRules,
  onUpdateAlertRules,
  settings,
}) => {
  const [activeSection, setActiveSection] = useState<'account' | 'alerts' | 'sql'>('account');
  const [emailInput, setEmailInput] = useState('');
  const [authStatusMsg, setAuthStatusMsg] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  // New Alert Form State
  const [newRuleType, setNewRuleType] = useState<'story' | 'market'>('story');
  const [newMinImp, setNewMinImp] = useState<number>(8);
  const [newTopic, setNewTopic] = useState<Topic | 'All'>('Conflict');
  const [newCountry, setNewCountry] = useState<string>('ALL');
  const [newAssetSymbol, setNewAssetSymbol] = useState<string>('BTC');
  const [newMovePct, setNewMovePct] = useState<number>(5);

  // Web Push Permission State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';

  const handleGoogleLogin = async () => {
    setAuthStatusMsg('Opening Google Sign-In via Supabase Auth...');
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthStatusMsg(`Google OAuth notice: ${error.message}`);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSendingLink(true);
    setAuthStatusMsg(null);
    try {
      const { error } = await signInWithEmailMagicLink(emailInput);
      if (error) {
        setAuthStatusMsg(`Magic Link error: ${error.message}`);
      } else {
        setAuthStatusMsg(`Check your inbox! A sign-in magic link has been sent to ${emailInput}.`);
      }
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    setAuthStatusMsg('Signed out of Supabase account.');
  };

  const handleEnableWebPush = async () => {
    if (typeof Notification === 'undefined') {
      setPushStatusMsg('Web Notifications are not supported in this browser.');
      return;
    }

    const perm = await Notification.requestPermission();
    setNotifPermission(perm);

    if (perm !== 'granted') {
      setPushStatusMsg('Notification permission was not granted.');
      return;
    }

    setPushStatusMsg('Browser Web Push notifications enabled!');

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const subJson: PushSubscriptionJSON = sub
          ? sub.toJSON()
          : {
              endpoint: `${window.location.origin}/browser-push-${Date.now()}`,
              keys: { auth: 'browser-granted' },
            };
        if (user) {
          await savePushSubscriptionToSupabase(user.id, subJson);
          setPushStatusMsg('Web Push enabled and synced to push_subscriptions in Supabase.');
        }
      }
    } catch {
      // fallback to local notification
    }
  };

  const handleTestNotification = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('WorldPulse Alert Active', {
        body: 'Custom alert rules (e.g., Importance 8+ in Conflict, BTC > 5%) are actively monitoring live feeds.',
        icon: '/icon.svg',
      });
      setPushStatusMsg('Test notification dispatched!');
    } else {
      setPushStatusMsg('Please enable notification permission first.');
    }
  };

  const handleAddAlertRule = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `rule-${Date.now()}`;
    let rule: CustomAlertRule;

    if (newRuleType === 'story') {
      const cLabel = newCountry === 'ALL' ? 'Global' : newCountry;
      rule = {
        id,
        name: `Importance ${newMinImp}+ in ${newTopic} (${cLabel})`,
        ruleType: 'story',
        minImportance: newMinImp,
        topic: newTopic,
        country: newCountry,
        enabled: true,
        createdAt: Date.now(),
      };
    } else {
      rule = {
        id,
        name: `${newAssetSymbol} moves more than ${newMovePct}%`,
        ruleType: 'market',
        assetSymbol: newAssetSymbol,
        movePctThreshold: newMovePct,
        enabled: true,
        createdAt: Date.now(),
      };
    }

    onUpdateAlertRules([rule, ...alertRules]);
  };

  const handleToggleRule = (id: string) => {
    onUpdateAlertRules(
      alertRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    onUpdateAlertRules(alertRules.filter((r) => r.id !== id));
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_RLS_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-alerts-title"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              Section 04 · Supabase Auth, Custom Alerts, Web Push &amp; RLS Schema
            </span>
            <h2 id="account-alerts-title" className="font-editorial text-xl font-semibold mt-0.5">
              Accounts, Custom Alerts &amp; Supabase RLS SQL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Account & Alerts modal"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div
          className={`px-5 border-b flex items-center gap-2 overflow-x-auto no-scrollbar ${
            isDark ? 'border-[#222631] bg-[#090A0D]' : 'border-[#DCD5C7] bg-[#EFEAE0]/50'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveSection('account')}
            className={`min-h-[42px] px-4 py-2 text-xs font-mono-tabular uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeSection === 'account'
                ? 'border-[#E05A2B] text-[#E05A2B] font-semibold'
                : 'border-transparent text-[#8C93A1]'
            }`}
          >
            1. Supabase Auth &amp; Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('alerts')}
            className={`min-h-[42px] px-4 py-2 text-xs font-mono-tabular uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeSection === 'alerts'
                ? 'border-[#E05A2B] text-[#E05A2B] font-semibold'
                : 'border-transparent text-[#8C93A1]'
            }`}
          >
            2. Custom Alerts &amp; Web Push ({alertRules.filter((r) => r.enabled).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sql')}
            className={`min-h-[42px] px-4 py-2 text-xs font-mono-tabular uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeSection === 'sql'
                ? 'border-[#E05A2B] text-[#E05A2B] font-semibold'
                : 'border-transparent text-[#8C93A1]'
            }`}
          >
            3. Exact Supabase RLS SQL Script
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* TAB 1: SUPABASE AUTH */}
          {activeSection === 'account' && (
            <div className="space-y-5">
              {user ? (
                <div
                  className={`p-4 border flex flex-wrap items-center justify-between gap-4 ${
                    isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="text-xs font-mono-tabular uppercase text-emerald-500 font-semibold">
                        Authenticated via Supabase
                      </div>
                      <div className="text-sm font-semibold">{user.email || user.id}</div>
                      <div className="text-xs font-mono-tabular text-[#8C93A1]">
                        Syncing user_follows, user_bookmarks, user_alerts &amp; push_subscriptions automatically
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[40px] px-4 py-2 border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Google OAuth */}
                  <div
                    className={`p-4 border space-y-3 ${
                      isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                    }`}
                  >
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                      Option A · Google Sign-In (Supabase OAuth)
                    </h3>
                    <p className="text-xs leading-relaxed opacity-80">
                      Sign in with your Google account to sync your followed countries, topics, saved bookmarks, and custom alert rules across all devices.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full min-h-[44px] px-4 py-2 bg-[#E05A2B] hover:bg-[#c94b20] text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  {/* Email Magic Link */}
                  <form
                    onSubmit={handleMagicLink}
                    className={`p-4 border space-y-3 ${
                      isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                    }`}
                  >
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                      Option B · Email Magic Link (Passwordless OTP)
                    </h3>
                    <p className="text-xs leading-relaxed opacity-80">
                      Receive an instant sign-in link in your email inbox via Supabase Auth.
                    </p>
                    <div className="flex items-stretch gap-2">
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@example.com"
                        className={`flex-1 min-h-[44px] px-3 py-2 border text-xs font-mono-tabular ${
                          isDark
                            ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                            : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isSendingLink}
                        className="min-h-[44px] px-4 py-2 border border-[#E05A2B] text-[#E05A2B] hover:bg-[#E05A2B] hover:text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isSendingLink ? 'Sending...' : 'Send Link'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {authStatusMsg && (
                <div className="p-3 border border-[#E05A2B]/50 bg-[#E05A2B]/10 text-xs font-mono-tabular text-[#E05A2B]">
                  {authStatusMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM ALERTS & WEB PUSH NOTIFICATIONS */}
          {activeSection === 'alerts' && (
            <div className="space-y-6">
              {/* Web Push Permission Prompt Box */}
              <div
                className={`p-4 border space-y-3 ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Web Push Notifications Permission Prompt</span>
                    </h3>
                    <p className="text-xs opacity-80 mt-1">
                      WorldPulse only sends browser notifications when one of your enabled Custom Alert Rules below is triggered (for example, Importance 8+ in Conflict or BTC moving more than 5%).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEnableWebPush}
                      className={`min-h-[40px] px-3.5 py-2 text-xs font-mono-tabular uppercase tracking-wider font-semibold cursor-pointer ${
                        notifPermission === 'granted'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#E05A2B] text-white hover:bg-[#c94b20]'
                      }`}
                    >
                      {notifPermission === 'granted'
                        ? '✓ Push Permission Granted'
                        : 'Enable Web Push Notifications'}
                    </button>
                    {notifPermission === 'granted' && (
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="min-h-[40px] px-3 py-2 border border-[#222631] text-xs font-mono-tabular hover:border-[#E05A2B] cursor-pointer"
                      >
                        Test Push
                      </button>
                    )}
                  </div>
                </div>
                {pushStatusMsg && (
                  <p className="text-xs font-mono-tabular text-[#E05A2B]">{pushStatusMsg}</p>
                )}
              </div>

              {/* Add New Custom Alert Form */}
              <form
                onSubmit={handleAddAlertRule}
                className={`p-4 border space-y-4 ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                    Create Custom Alert Rule
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono-tabular">
                    <button
                      type="button"
                      onClick={() => setNewRuleType('story')}
                      className={`px-2.5 py-1 border cursor-pointer ${
                        newRuleType === 'story'
                          ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                          : 'border-[#222631] text-[#8C93A1]'
                      }`}
                    >
                      Story Severity Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRuleType('market')}
                      className={`px-2.5 py-1 border cursor-pointer ${
                        newRuleType === 'market'
                          ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                          : 'border-[#222631] text-[#8C93A1]'
                      }`}
                    >
                      Market Move Rule
                    </button>
                  </div>
                </div>

                {newRuleType === 'story' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end font-mono-tabular text-xs">
                    <div>
                      <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                        Min Importance ({newMinImp}+)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={newMinImp}
                        onChange={(e) => setNewMinImp(Number(e.target.value))}
                        className={`w-full min-h-[40px] px-3 py-1.5 border ${
                          isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                        Topic
                      </label>
                      <select
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value as Topic | 'All')}
                        className={`w-full min-h-[40px] px-3 py-1.5 border ${
                          isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                        }`}
                      >
                        <option value="All">All Topics</option>
                        {ALL_TOPICS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                        Country
                      </label>
                      <select
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        className={`w-full min-h-[40px] px-3 py-1.5 border ${
                          isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                        }`}
                      >
                        <option value="ALL">All Countries</option>
                        {Object.values(COUNTRY_GAZETTEER)
                          .filter((c) => c.code !== 'GL')
                          .map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 bg-[#E05A2B] text-white uppercase font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Alert</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end font-mono-tabular text-xs">
                    <div>
                      <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                        Asset / Ticker
                      </label>
                      <select
                        value={newAssetSymbol}
                        onChange={(e) => setNewAssetSymbol(e.target.value)}
                        className={`w-full min-h-[40px] px-3 py-1.5 border ${
                          isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                        }`}
                      >
                        <option value="BTC">BTC (Bitcoin)</option>
                        <option value="ETH">ETH (Ethereum)</option>
                        <option value="SOL">SOL (Solana)</option>
                        <option value="GOLD">GOLD (Spot Futures)</option>
                        <option value="WTI OIL">WTI OIL (Crude)</option>
                        <option value="USD/INR">USD/INR</option>
                        <option value="NIFTY 50">NIFTY 50</option>
                        <option value="S&P 500">S&amp;P 500</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                        24h Move Threshold (%)
                      </label>
                      <input
                        type="number"
                        min={0.5}
                        max={50}
                        step={0.5}
                        value={newMovePct}
                        onChange={(e) => setNewMovePct(Number(e.target.value))}
                        className={`w-full min-h-[40px] px-3 py-1.5 border ${
                          isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 bg-[#E05A2B] text-white uppercase font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Market Alert</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Active Alert Rules List */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-[#8C93A1]">
                  Configured Alert Rules ({alertRules.length})
                </h4>
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 border flex items-center justify-between gap-3 text-xs font-mono-tabular ${
                      isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="accent-[#E05A2B] w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold">{rule.name}</span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 border border-[#222631] text-[#E05A2B]">
                          {rule.ruleType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      aria-label={`Delete alert ${rule.name}`}
                      className="p-1.5 text-[#8C93A1] hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXACT SUPABASE SQL WITH ROW LEVEL SECURITY */}
          {activeSection === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E05A2B] font-semibold">
                    <Database className="w-4 h-4" />
                    <ShieldCheck className="w-4 h-4" />
                    <span>Row Level Security (RLS) Enabled: auth.uid() = user_id</span>
                  </div>
                  <p className="text-xs opacity-80">
                    Run this exact SQL script in your Supabase SQL Editor to create <code>user_follows</code>, <code>user_bookmarks</code>, <code>user_alerts</code>, and <code>push_subscriptions</code> so users only see and modify their own rows.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="min-h-[40px] px-4 py-2 bg-[#E05A2B] text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copied SQL Script!' : 'Copy Full SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#090A0D] border border-[#222631] text-xs font-mono-tabular text-[#10B981] overflow-x-auto max-h-[440px]">
                {SUPABASE_RLS_SQL_SCRIPT}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
