import { useEffect, useState } from 'react';
import { useSession } from '../session';
import { api } from '../api/client';
import { nimToLuna, lunaToNim } from '../lib/luna';
import { sendCareDropPayment } from '../nimiq/provider';

type Prompt = { id: string; emoji: string; title: string; promptText: string; relationshipTypes: string[] };

export function CreateCareDropScreen({
  pairId,
  recipientAddress,
  onBack,
  onSent,
}: {
  pairId: string;
  recipientAddress: string;
  onBack: () => void;
  onSent: (caredropId: string) => void;
}) {
  const { sessionToken } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<'form' | 'review' | 'sending' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.prompts().then((res) => setPrompts(res.prompts));
  }, []);

  const promptText = selectedPrompt?.id === 'your-choice' ? customPrompt : selectedPrompt?.promptText ?? '';

  const canReview = promptText.trim().length > 0 && note.trim().length > 0 && Number(amount) > 0;

  const send = async () => {
    if (!sessionToken) return;
    setStage('sending');
    setError(null);
    try {
      const amountLuna = nimToLuna(amount);
      const drop = await api.createCareDrop(
        { pairId, promptId: selectedPrompt?.id, promptText, amountLuna, sealedNote: note },
        sessionToken,
      );

      const payment = await sendCareDropPayment({
        recipient: recipientAddress,
        amountLuna: drop.amountLuna,
        reference: drop.reference,
      });

      if (!payment.ok) {
        setError(payment.message);
        setStage('error');
        return;
      }

      await api.submitPayment(drop.id, payment.value, sessionToken);
      onSent(drop.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong sending your CareDrop.');
      setStage('error');
    }
  };

  if (stage === 'review') {
    return (
      <div className="screen">
        <button className="btn btn-ghost btn-back" onClick={() => setStage('form')}>← Edit</button>
        <h1>Review your CareDrop</h1>
        <div className="review-card">
          <p><strong>To:</strong> your Loop partner</p>
          <p><strong>Amount:</strong> {amount} NIM</p>
          <p><strong>Prompt:</strong> {promptText}</p>
          <p><strong>Private note:</strong> hidden until they respond</p>
        </div>
        <p className="hint">Nimiq Pay will ask you to approve a {amount} NIM gift.</p>
        <button className="btn btn-primary" onClick={send}>Approve in Nimiq Pay</button>
      </div>
    );
  }

  if (stage === 'sending') {
    return (
      <div className="screen screen-center">
        <div className="spinner" />
        <p>Waiting for your approval in Nimiq Pay…</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="screen screen-center">
        <div className="alert alert-error">
          <strong>CareDrop not sent.</strong>
          <p>{error}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setStage('review')}>Try again</button>
        <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <h1>Send a CareDrop</h1>

      <p className="hint">Choose a prompt</p>
      <div className="prompt-grid">
        {prompts.map((p) => (
          <button
            key={p.id}
            className={`prompt-card ${selectedPrompt?.id === p.id ? 'prompt-card-active' : ''}`}
            onClick={() => setSelectedPrompt(p)}
          >
            <span className="prompt-emoji">{p.emoji}</span>
            <span>{p.title}</span>
          </button>
        ))}
      </div>

      {selectedPrompt?.id === 'your-choice' && (
        <textarea
          className="input"
          placeholder="Write your own prompt…"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      )}

      <label className="field-label">Amount (NIM)</label>
      <input className="input" type="number" min="0.00001" step="0.00001" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <p className="hint">= {amount ? lunaToNim(nimToLuna(amount || '0')) : '0'} NIM</p>

      <label className="field-label">Private note</label>
      <textarea
        className="input"
        placeholder="A note only they'll see, once they respond…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button className="btn btn-primary" disabled={!canReview} onClick={() => setStage('review')}>
        Review CareDrop
      </button>
    </div>
  );
}
