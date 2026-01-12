"use client"
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Mic, Square, Send, X, AlertCircle, Trash2, Play, Pause } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { toast } from 'sonner';

// Recording time limits following best practices (Discord/Telegram standard)
const MAX_RECORDING_DURATION = 300; // 5 minutes maximum (Discord: ~5min, Telegram: 1hr)
const MIN_RECORDING_DURATION = 1; // 1 second minimum
const WARNING_DURATION = 30; // Show warning in last 30 seconds

export function VoiceRecorder({ onSendVoiceMessage, onCancel, className, autoStart = false }) {
  const [permissionError, setPermissionError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Real-time audio level indicator
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('default');
  const [currentMicrophoneName, setCurrentMicrophoneName] = useState('');
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationIntervalRef = useRef(null);
  const currentAudioRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioBuffersRef = useRef([]);

  // Detect iOS and check MediaRecorder support
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOSSafari(isIOS);
    
    // Check MediaRecorder support
    if (typeof MediaRecorder !== 'undefined') {
      // Test if MediaRecorder actually works
      try {
        const testSupported = MediaRecorder.isTypeSupported('audio/webm') || 
                            MediaRecorder.isTypeSupported('audio/mp4') ||
                            MediaRecorder.isTypeSupported('audio/wav');
        setBrowserSupported(testSupported);
      } catch (err) {
        // If MediaRecorder exists but throws errors, we'll use Web Audio API fallback
        setBrowserSupported(true); // Still try to use fallback
      }
    } else {
      // No MediaRecorder, but we can still use Web Audio API fallback on iOS
      setBrowserSupported(isIOS); // iOS can use Web Audio API fallback
    }
  }, []);

  // Get all available microphones
  const enumerateMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      setAvailableMicrophones(microphones);
      return microphones;
    } catch (err) {
      console.error('Error enumerating microphones:', err);
      return [];
    }
  };

  // Load microphones and saved preference on mount
  useEffect(() => {
    const loadMicrophones = async () => {
      await enumerateMicrophones();
      
      // Load saved microphone preference
      const savedMicId = localStorage.getItem('preferredMicrophoneId');
      if (savedMicId) {
        setSelectedMicrophoneId(savedMicId);
      }
    };
    
    loadMicrophones();
  }, []);

  // Convert raw audio buffers to WAV format (for iOS Safari fallback)
  const bufferToWave = (abuffer, len) => {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write audio data
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (pos < len) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
      pos++;
    }

    return new Blob([buffer], { type: 'audio/wav' });

    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  // Generate real waveform from audio blob (like Discord/Telegram)
  const generateWaveform = async (audioBlob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const rawData = audioBuffer.getChannelData(0); // Get first channel
    const samples = 32; // Number of bars in waveform
    const blockSize = Math.floor(rawData.length / samples);
    const waveform = [];
    
    for (let i = 0; i < samples; i++) {
      const start = blockSize * i;
      let sum = 0;
      
      // Calculate RMS (Root Mean Square) for this block
      for (let j = 0; j < blockSize; j++) {
        sum += rawData[start + j] ** 2;
      }
      
      const rms = Math.sqrt(sum / blockSize);
      waveform.push(Math.min(1, rms * 5)); // Scale and cap at 1
    }
    
    // Normalize waveform data
    const max = Math.max(...waveform);
    return max > 0 ? waveform.map(v => v / max) : waveform;
  };

  const startRecording = async () => {
    try {
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }
      
      // Audio constraints optimized for voice recording
      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 1
      };
      
      // Check if user previously selected a specific microphone
      const savedMicrophoneId = localStorage.getItem('preferredMicrophoneId');
      
      if (selectedMicrophoneId && selectedMicrophoneId !== 'default') {
        audioConstraints.deviceId = { exact: selectedMicrophoneId };
      } else if (savedMicrophoneId && savedMicrophoneId !== 'default') {
        audioConstraints.deviceId = { exact: savedMicrophoneId };
      } else {
        // Try to auto-select communication device
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === 'audioinput');
          
          const commDevice = audioInputs.find(d => 
            d.label.toLowerCase().includes('communication') ||
            d.label.toLowerCase().includes('headset') ||
            d.label.toLowerCase().includes('headphone')
          );
          
          if (commDevice) {
            audioConstraints.deviceId = { exact: commDevice.deviceId };
          }
        } catch (err) {
          // Use default if auto-selection fails
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      
      audioStreamRef.current = stream;
      
      // Get the actual microphone being used
      const audioTrack = stream.getAudioTracks()[0];
      const micName = audioTrack.label;
      setCurrentMicrophoneName(micName);
      
      // Refresh microphone list after permission is granted
      await enumerateMicrophones();
      
      // Check if we should use MediaRecorder or Web Audio API fallback
      const useMediaRecorder = typeof MediaRecorder !== 'undefined' && 
        (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ||
         MediaRecorder.isTypeSupported('audio/mp4') ||
         MediaRecorder.isTypeSupported('audio/wav'));
      
      if (useMediaRecorder && !isIOSSafari) {
        // Use MediaRecorder (standard method)
        await startMediaRecorderRecording(stream);
      } else {
        // Use Web Audio API fallback (for iOS Safari)
        await startWebAudioRecording(stream);
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  };

  // Standard MediaRecorder recording
  const startMediaRecorderRecording = async (stream) => {
    try {
      
      // Select best supported audio format
      const formats = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/wav'
      ];
      
      let mimeType = '';
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Add error listener
      mediaRecorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        toast.error('Recording error: ' + event.error.name, { duration: 5000 });
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Validate we have audio data
        if (audioChunksRef.current.length === 0) {
          toast.error('❌ No audio recorded. Please check microphone permissions and try again.', { duration: 5000 });
          setIsProcessing(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Validate blob size
        if (audioBlob.size === 0) {
          toast.error('❌ Recording failed. Please try again.', { duration: 3000 });
          setIsProcessing(false);
          return;
        }
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Generate waveform data by analyzing audio
        try {
          const waveform = await generateWaveform(audioBlob);
          setWaveformData(waveform);
        } catch (error) {
          console.error('Error generating waveform:', error);
          setWaveformData(Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.1));
        }
        
        setIsProcessing(false);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      setDuration(0);
      
      // Start audio level monitoring
      startAudioLevelMonitoring(stream);
      
      // Start duration counter with time limit checks
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // Show warning when approaching max duration
          if (newDuration >= MAX_RECORDING_DURATION - WARNING_DURATION) {
            setShowTimeWarning(true);
          }
          
          // Auto-stop at maximum duration
          if (newDuration >= MAX_RECORDING_DURATION) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          
          return newDuration;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  };

  // Web Audio API recording (iOS Safari fallback)
  const startWebAudioRecording = async (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      audioBuffersRef.current = [];
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessorNode(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (isRecordingRef.current) {
          const channelData = e.inputBuffer.getChannelData(0);
          audioBuffersRef.current.push(new Float32Array(channelData));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      mediaRecorderRef.current = { processor, source }; // Store for cleanup
      
      setIsRecording(true);
      isRecordingRef.current = true;
      setDuration(0);
      
      // Start audio level monitoring
      startAudioLevelMonitoring(stream);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          if (newDuration >= MAX_RECORDING_DURATION - WARNING_DURATION) {
            setShowTimeWarning(true);
          }
          
          if (newDuration >= MAX_RECORDING_DURATION) {
            stopWebAudioRecording();
            return MAX_RECORDING_DURATION;
          }
          
          return newDuration;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting Web Audio recording:', error);
      throw error;
    }
  };

  const stopWebAudioRecording = async () => {
    if (!audioContextRef.current) return;
    
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(true);
    setShowTimeWarning(false);
    setAudioLevel(0);
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    try {
      // Cleanup
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.processor.disconnect();
        mediaRecorderRef.current.source.disconnect();
      }
      
      // Merge all audio buffers
      const totalLength = audioBuffersRef.current.reduce((acc, buf) => acc + buf.length, 0);
      const mergedBuffer = new Float32Array(totalLength);
      let offset = 0;
      
      for (const buffer of audioBuffersRef.current) {
        mergedBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      
      // Create AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        mergedBuffer.length,
        audioContextRef.current.sampleRate
      );
      audioBuffer.getChannelData(0).set(mergedBuffer);
      
      // Convert to WAV
      const wavBlob = bufferToWave(audioBuffer, audioBuffer.length);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
      
      // Generate waveform
      try {
        const waveform = await generateWaveform(wavBlob);
        setWaveformData(waveform);
      } catch (error) {
        console.error('Error generating waveform:', error);
        setWaveformData(Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.1));
      }
      
      setIsProcessing(false);
      
      // Cleanup
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      await audioContextRef.current.close();
      
    } catch (error) {
      console.error('Error stopping Web Audio recording:', error);
      setIsProcessing(false);
    }
  };

  // Helper function to start audio level monitoring
  const startAudioLevelMonitoring = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (!isRecordingRef.current) {
          setAudioLevel(0);
          microphone.disconnect();
          audioContext.close();
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        // Simple average volume calculation
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volume = Math.round(average);
        
        setAudioLevel(volume);
        
        requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
      
    } catch (err) {
      console.error('Audio level monitoring error:', err);
    }
  };

  const stopRecording = () => {
    if (audioContextRef.current) {
      // Web Audio API recording
      stopWebAudioRecording();
    } else if (mediaRecorderRef.current && isRecording) {
      // MediaRecorder recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsProcessing(true);
      setShowTimeWarning(false);
      setAudioLevel(0);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(false);
    setDuration(0);
    setAudioLevel(0);
    setAudioUrl(null);
    setWaveformData([]);
    setShowTimeWarning(false);
    
    // Clean up Web Audio API recording
    if (audioContextRef.current) {
      try {
        if (mediaRecorderRef.current?.processor) {
          mediaRecorderRef.current.processor.disconnect();
          mediaRecorderRef.current.source.disconnect();
        }
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (err) {
        console.error('Error stopping audio context:', err);
      }
      audioBuffersRef.current = [];
    }
    
    // Clean up MediaRecorder
    if (mediaRecorderRef.current?.stop) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping media recorder:', err);
      }
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    
    // Clean up stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Clean up duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const clearRecording = () => {
    setDuration(0);
    setAudioUrl(null);
    setWaveformData([]);
    setIsProcessing(false);
    
    // Clean up audio URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const play = () => {
    if (audioUrl) {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        currentAudioRef.current = null;
        toast.error('❌ Failed to play preview', { duration: 3000 });
      };
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        setIsPlaying(false);
        currentAudioRef.current = null;
        toast.error('❌ Failed to play preview: ' + err.message, { duration: 3000 });
      });
    }
  };

  const pause = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
  };

  // Auto-start recording when component mounts if autoStart is true
  useEffect(() => {
    if (autoStart && !isRecording && !audioUrl && !isProcessing && !isInitializing) {
      handleStartRecording();
    }
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handleStartRecording = async () => {
    if (isRecording || isProcessing || isInitializing) return;
    
    // Immediately show recording interface
    setIsInitializing(true);
    setPermissionError(null);
    
    try {
      await startRecording();
      setIsInitializing(false);
    } catch (error) {
      console.error('Recording error:', error);
      setIsInitializing(false);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        const errorMsg = 'Microphone permission denied. Please allow microphone access to record voice messages.';
        setPermissionError(errorMsg);
        toast.error(`❌ ${errorMsg}`, { duration: 5000 });
      } else {
        const errorMsg = 'Failed to start recording. Please check your microphone.';
        setPermissionError(errorMsg);
        toast.error(`❌ ${errorMsg}`, { duration: 5000 });
      }
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) {
      return;
    }
    
    try {
      stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      clearRecording();
    }
  };

  const handleSend = async () => {
    if (audioUrl && duration > 0) {
      // Check minimum duration
      if (duration < MIN_RECORDING_DURATION) {
        toast.error('❌ Recording too short. Please record for at least 1 second.', { duration: 3000 });
        return;
      }
      
      try {
        setIsProcessing(true);
        
        // Convert blob URL to file for upload
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        // Determine file extension based on mime type
        const extension = blob.type.includes('webm') ? 'webm' : 
                         blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-message.${extension}`, { type: blob.type });
        
        // Upload audio file
        const formData = new FormData();
        formData.append('audio', file);
        
        const uploadResponse = await fetch('/api/upload/audio', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload audio');
        }
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
          const audioFileUrl = uploadData.filePath || uploadData.audioUrl;
          
          if (!audioFileUrl) {
            throw new Error('No audio URL returned from server');
          }
          
          onSendVoiceMessage(audioFileUrl, duration, waveformData);
          toast.success('✅ Voice message sent!', { duration: 2000 });
          clearRecording();
          onCancel();
        } else {
          throw new Error(uploadData.error || uploadData.details || 'Upload failed');
        }
      } catch (error) {
        console.error('Error sending voice message:', error);
        toast.error(`❌ Failed to send voice message: ${error.message}`, { duration: 5000 });
        setIsProcessing(false);
      }
    }
  };

  const handleCancel = () => {
    try {
      cancelRecording();
      onCancel();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      clearRecording();
      onCancel();
    }
  };

  const handlePlayPause = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };


  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'away': return 'Away';
      default: return 'Unknown';
    }
  };

  // Show warning for unsupported browsers
  if (!browserSupported) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive text-center font-medium">
          Voice messages not supported
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Your browser doesn't support voice recording. Please use Chrome, Edge, or Firefox.
        </p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  // If there's a permission error, show it
  if (permissionError) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive text-center">{permissionError}</p>
        <Button variant="outline" size="sm" onClick={() => setPermissionError(null)}>
          Try Again
        </Button>
      </div>
    );
  }

  // If recording, show recording interface
  if (isRecording) {
    const remainingTime = MAX_RECORDING_DURATION - duration;
    const isNearLimit = duration >= MAX_RECORDING_DURATION - WARNING_DURATION;
    
    // Audio level indicator
    const levelPercentage = (audioLevel / 255) * 100;
    const getLevelColor = () => {
      if (audioLevel < 5) return 'bg-destructive';
      if (audioLevel < 20) return 'bg-yellow-500';
      return 'bg-green-500';
    };
    
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              isNearLimit ? "bg-orange-500" : "bg-red-500"
            )} />
            <span className="text-sm font-medium">Recording...</span>
          </div>
          {currentMicrophoneName && (
            <span className="text-xs text-muted-foreground">
              🎤 {currentMicrophoneName}
            </span>
          )}
        </div>
        
        {/* Audio Level Indicator */}
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Microphone Level</span>
            <span className={cn(
              "font-medium",
              audioLevel < 5 ? "text-destructive" : audioLevel < 20 ? "text-yellow-500" : "text-green-500"
            )}>
              {audioLevel < 5 ? '⚠️ TOO LOW!' : audioLevel < 20 ? 'Low' : 'Good'} ({audioLevel}/255)
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-200", getLevelColor())}
              style={{ width: `${levelPercentage}%` }}
            />
          </div>
          {audioLevel < 5 && duration > 2 && (
            <div className="text-xs text-destructive text-center space-y-1">
              <p className="font-medium">⚠️ Microphone not detecting sound!</p>
              <p>Check Windows sound settings or select a different microphone.</p>
            </div>
          )}
        </div>
        
        {/* Show microphone selector if having issues */}
        {availableMicrophones.length > 1 && audioLevel < 5 && duration > 2 && (
          <div className="w-full max-w-xs space-y-2 border border-destructive/20 rounded-md p-3 bg-destructive/5">
            <label className="text-xs font-medium text-foreground">Try a different microphone:</label>
            <select
              value={selectedMicrophoneId}
              onChange={(e) => {
                const newMicId = e.target.value;
                setSelectedMicrophoneId(newMicId);
                localStorage.setItem('preferredMicrophoneId', newMicId);
                toast.info('🔄 Microphone changed. Please stop and start recording again.', { duration: 3000 });
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="default">Auto-detect</option>
              {availableMicrophones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className={cn(
          "text-2xl font-mono",
          isNearLimit ? "text-orange-600" : "text-foreground"
        )}>
          {formatDuration(duration)}
        </div>
        
        {/* Time limit indicator */}
        <div className="text-xs text-muted-foreground">
          {isNearLimit ? (
            <span className="text-orange-600 font-medium">
              Auto-stop in {remainingTime}s
            </span>
          ) : (
            `Max: ${formatDuration(MAX_RECORDING_DURATION)}`
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleStopRecording} size="sm" variant="destructive">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </div>
    );
  }

  // If processing, show processing interface
  if (isProcessing) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Processing recording...</span>
      </div>
    );
  }

  // If we have a recorded audio, show playback interface
  if (audioUrl) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Button onClick={handlePlayPause} size="sm" variant="outline">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <span className="text-sm font-mono">{formatDuration(duration)}</span>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSend} size="sm">
            <Send className="h-4 w-4" />
            Send
          </Button>
          <Button onClick={handleCancel} size="sm" variant="outline">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    );
  }

  // Default state - show record button
  return (
    <div className={cn("flex flex-col items-center justify-center p-4 space-y-3", className)}>
      {/* Microphone selector - only show if multiple microphones or having issues */}
      {availableMicrophones.length > 1 && (
        <details className="w-full max-w-xs">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
            ⚙️ Microphone Settings ({availableMicrophones.length} devices)
          </summary>
          <div className="mt-2 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Select Microphone:</label>
            <select
              value={selectedMicrophoneId}
              onChange={(e) => {
                const newMicId = e.target.value;
                setSelectedMicrophoneId(newMicId);
                localStorage.setItem('preferredMicrophoneId', newMicId);
                toast.success('✅ Microphone preference saved!', { duration: 2000 });
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="default">Auto-detect (Recommended)</option>
              {availableMicrophones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Your choice will be remembered for next time
            </p>
          </div>
        </details>
      )}
      
      <Button 
        onClick={handleStartRecording} 
        size="lg" 
        className="rounded-full w-16 h-16"
        disabled={isInitializing}
      >
        <Mic className="h-6 w-6" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {isInitializing ? 'Initializing...' : 'Tap to record'}
      </span>
    </div>
  );
}