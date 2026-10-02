/**
 * Chamada de pacientes por voz (Web Speech API).
 * Conformidade LGPD: o texto falado usa apenas o número do prontuário.
 */

let voiceCache = []

const FEMALE_HINTS = ['female', 'maria', 'luciana', 'francisca', 'fernanda', 'vitoria', 'vitória', 'helena', 'camila', 'joana', 'ines', 'inês', 'mulher']

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices()
  if (voices && voices.length) voiceCache = voices
  return voiceCache
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/** Escolhe a melhor voz pt-BR disponível, preferindo voz feminina. */
export function pickVoice() {
  const voices = voiceCache.length ? voiceCache : loadVoices()
  if (!voices.length) return null
  const ptBR = voices.filter((voice) => /pt[-_]?BR/i.test(voice.lang))
  const pool = ptBR.length ? ptBR : voices.filter((voice) => /^pt/i.test(voice.lang))
  if (!pool.length) return null
  const female = pool.find((voice) => FEMALE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint)))
  return female || pool[0]
}

/** Monta a frase padronizada de chamada. */
export function buildCallText(prontuario, local) {
  return `Atenção. Paciente de número de prontuário ${String(prontuario).split('').join(' ')}, favor comparecer à ${local}. Repito: prontuário ${String(prontuario).split('').join(' ')}, favor comparecer à ${local}.`
}

/**
 * Fala o texto informado. Cancela falas pendentes e aguarda 150ms
 * (alguns navegadores ignoram o speak() imediatamente após cancel()).
 */
export function speak(text, { onEnd } = {}) {
  return new Promise((resolve) => {
    if (!speechAvailable()) {
      onEnd?.()
      resolve(false)
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()
    window.setTimeout(() => {
      const utterance = new window.SpeechSynthesisUtterance(text)
      const voice = pickVoice()
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang || 'pt-BR'
      utterance.volume = 1
      utterance.rate = 0.92
      utterance.pitch = 1
      const finish = () => {
        onEnd?.()
        resolve(true)
      }
      utterance.onend = finish
      utterance.onerror = finish
      synth.speak(utterance)
    }, 150)
  })
}

export function cancelSpeech() {
  if (speechAvailable()) window.speechSynthesis.cancel()
}
