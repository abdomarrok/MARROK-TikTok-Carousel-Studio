import React, { useState } from 'react';
import { Lightbulb, Sparkles, ArrowRight, X, Cpu, ShieldAlert, Database, GitMerge, Terminal, Flame, Zap } from 'lucide-react';
import { CarouselData } from '../types';

interface TopicInspirationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topicTitle: string, rawNotes: string, category: string) => void;
  onShowToast: (msg: string) => void;
}

interface CuratedTopic {
  id: string;
  category: string;
  icon: any;
  title: string;
  hookAngle: string;
  notes: string;
  themeRecommendation: string;
}

const TRENDING_TOPICS: CuratedTopic[] = [
  {
    id: 'ebpf_kernel',
    category: 'LINUX KERNEL & OBSERVABILITY',
    icon: Terminal,
    title: 'Why eBPF is Replacing Linux Kernel Modules',
    hookAngle: 'Safe kernel-level programmability with zero reboots and JIT sandboxing.',
    notes: 'eBPF allows executing sandboxed bytecode in the Linux kernel without changing kernel source code or loading dangerous modules. It enables high-speed packet filtering (XDP), deep system call observability, and runtime security with near-zero overhead.',
    themeRecommendation: 'emerald',
  },
  {
    id: 'scion_git',
    category: 'AI INFRASTRUCTURE & VCS',
    icon: GitMerge,
    title: 'Why Anthropic Built Scion to Replace Git',
    hookAngle: 'AI agents making 25 million checkouts a day broke 100GB Git monorepos.',
    notes: 'Git was built for human speeds. When thousands of AI agents write code simultaneously, Git merges and mirrors collapse. Anthropic engineered Scion, a server-authoritative distributed version control system that operates on changesets and frees 25% of CI compute.',
    themeRecommendation: 'teal',
  },
  {
    id: 'ghidra_reversing',
    category: 'REVERSE ENGINEERING & APPOPS',
    icon: Cpu,
    title: 'Reverse Engineering Closed Binaries in 2026',
    hookAngle: 'From decompiled assembly to high-level C with Ghidra and IDA Pro.',
    notes: 'How modern binary analysts deconstruct stripped ELF and PE executables. Extracting strings, following cross-references, identifying memory-unsafe functions, and bypassing anti-debugging hooks.',
    themeRecommendation: 'cyber',
  },
  {
    id: 'k8s_security',
    category: 'KUBERNETES & CLOUD SEC',
    icon: ShieldAlert,
    title: 'Kubernetes Admission Webhooks: The First Line of Defense',
    hookAngle: 'Validating vs Mutating controllers to enforce container zero-trust.',
    notes: 'Why scanning container images in CI is not enough. Dynamic admission controllers inspect every pod creation payload, blocking privileged containers, hostPath mounts, and unauthorized image registries before etcd persistence.',
    themeRecommendation: 'blueprint',
  },
  {
    id: 'raft_consensus',
    category: 'DISTRIBUTED SYSTEMS INTERNALS',
    icon: Database,
    title: 'How Raft Solved Distributed Consensus for Humans',
    hookAngle: 'Leader election, log replication, and split-brain mitigation made intuitive.',
    notes: 'Paxos was mathematically rigorous but notoriously hard to implement. Raft breaks consensus into independent sub-problems: leader election via randomized timers, log replication, and committed index invariants.',
    themeRecommendation: 'amber',
  },
  {
    id: 'llm_inference',
    category: 'DEEP LEARNING & COMPILERS',
    icon: Zap,
    title: 'Speculative Decoding: 2.5x Faster LLM Inference',
    hookAngle: 'Using a small draft model to verify tokens in parallel on GPU.',
    notes: 'Autoregressive token generation is memory-bandwidth bound. Speculative decoding runs a tiny draft model to propose 4-5 tokens, which the larger primary model validates in a single forward pass, dramatically boosting throughput.',
    themeRecommendation: 'violet',
  },
];

export const TopicInspirationDrawer: React.FC<TopicInspirationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTopic,
  onShowToast,
}) => {
  const [customKeyword, setCustomKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(TRENDING_TOPICS.map((t) => t.category)))];

  const filteredTopics = filterCategory === 'all'
    ? TRENDING_TOPICS
    : TRENDING_TOPICS.filter((t) => t.category === filterCategory);

  const handleCustomKeywordGenerate = () => {
    if (!customKeyword.trim()) return;
    const term = customKeyword.trim();
    const generatedTitle = `Deep Dive: How ${term} Works Under the Hood`;
    const generatedNotes = `Comprehensive technical analysis of ${term}. Architecture, core data structures, performance benchmarks, engineering bottlenecks, and production lessons learned.`;
    const generatedCategory = `${term.toUpperCase()} ARCHITECTURE`;

    onSelectTopic(generatedTitle, generatedNotes, generatedCategory);
    onShowToast(`Loaded custom topic for "${term}"`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0b1015] border border-[#1E2833] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2833] bg-[#0e161c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#37E2C0]/15 text-[#37E2C0] border border-[#37E2C0]/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Topic Inspiration & Trending Hooks
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-mono">
                  <Flame className="w-3 h-3" /> High CTR
                </span>
              </h2>
              <p className="text-xs text-[#8E989E]">
                Select a trending engineering topic or type any technology keyword to generate instant slides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E989E] hover:text-white hover:bg-[#1a232c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Keyword Fast Generator */}
        <div className="p-4 bg-[#0d141a] border-b border-[#1E2833]">
          <label className="text-xs font-semibold text-white block mb-1.5">
            Got a specific tool or concept in mind? Type any tech term:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Kafka partition rebalancing, Rust memory safety, BGP route leaks..."
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomKeywordGenerate()}
              className="flex-1 px-3.5 py-2 text-xs bg-black/50 border border-[#1E2833] rounded-xl text-white placeholder-[#5d6872] focus:outline-none focus:border-[#37E2C0]"
            />
            <button
              onClick={handleCustomKeywordGenerate}
              disabled={!customKeyword.trim()}
              className="px-4 py-2 text-xs font-bold bg-[#37E2C0] text-black rounded-xl hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Build Topic
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 overflow-x-auto border-b border-[#1E2833] bg-[#090e13] text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-[#37E2C0] text-black font-bold'
                  : 'text-[#8E989E] bg-[#121c22] hover:text-white hover:bg-[#18262f]'
              }`}
            >
              {cat === 'all' ? 'All Domains' : cat}
            </button>
          ))}
        </div>

        {/* Topic Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {filteredTopics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#1E2833] bg-[#0e161c] hover:border-[#37E2C0]/40 hover:bg-[#111c23] transition-all group relative"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#18252e] border border-[#263b48] flex items-center justify-center text-[#37E2C0] shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono tracking-wider text-[#37E2C0] font-semibold block mb-0.5">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#37E2C0] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#CDD5D9] mt-1 font-medium">
                        "{item.hookAngle}"
                      </p>
                      <p className="text-[11px] text-[#8E989E] mt-1.5 line-clamp-2">
                        {item.notes}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTopic(item.title, item.notes, item.category);
                      onShowToast(`Selected "${item.title}"`);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1a2b36] hover:bg-[#37E2C0] hover:text-black text-[#37E2C0] text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 self-center"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E2833] bg-[#0c1318] flex items-center justify-between text-xs text-[#8E989E]">
          <span>Every topic automatically includes 3 hook variants & dual Arabic captions</span>
          <button
            onClick={onClose}
            className="text-xs text-[#CDD5D9] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
