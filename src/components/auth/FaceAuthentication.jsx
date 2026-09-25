import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CheckCircle2, AlertCircle, RefreshCw, Eye, ShieldCheck,
  VideoOff, ScanFace
} from 'lucide-react'
import { faceDetectionService, faceAuthenticationService } from '../../services/faceAuthenticationService'

export const AUTH_STATES = {
  IDLE: 'IDLE',                       // "Face authentication required"
  REQUESTING_CAMERA: 'REQUESTING',   // "Requesting camera access..."
  CAMERA_ACTIVE: 'CAMERA_ACTIVE',     // Camera active, looking for face
  NO_FACE: 'NO_FACE',                 // "No face detected. Position your face inside the frame."
  FACE_DETECTED: 'FACE_DETECTED',     // "Face detected. Hold still..."
  VERIFYING: 'VERIFYING',             // "Verifying identity..."
  SUCCESS: 'SUCCESS',                 // "Face verified successfully ✓"
  FAILURE: 'FAILURE',                 // "Face verification failed. Please try again."
  CAMERA_DENIED: 'CAMERA_DENIED',     // "Camera access is required"
}

export function FaceAuthentication({
  userId,
  onVerificationComplete,
  verificationResult,
  disabled = false,
  registrationMode = false,
}) {
  const [status, setStatus] = useState(
    verificationResult?.verified ? AUTH_STATES.SUCCESS : AUTH_STATES.IDLE
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [holdProgress, setHoldProgress] = useState(0)

  const statusRef = useRef(
    verificationResult?.verified ? AUTH_STATES.SUCCESS : AUTH_STATES.IDLE
  )
  const isScanningRef = useRef(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectionLoopRef = useRef(null)
  const holdTimerRef = useRef(null)
  const faceDetectedRef = useRef(false)

  // Keep statusRef in sync with status
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Clean up camera stream and animation loops
  const stopAll = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current)
      detectionLoopRef.current = null
    }
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (streamRef.current) {
      faceDetectionService.stopCamera(streamRef.current)
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    return () => {
      isScanningRef.current = false
      stopAll()
    }
  }, [stopAll])

  // Handle user clicking "Cancel Scan"
  const handleCancelScan = useCallback(() => {
    isScanningRef.current = false
    stopAll()
    setStatus(AUTH_STATES.IDLE)
    statusRef.current = AUTH_STATES.IDLE
    setHoldProgress(0)
    setConfidence(0)
    faceDetectedRef.current = false
    setErrorMessage('')
    onVerificationComplete?.(null)
  }, [stopAll, onVerificationComplete])

  // Start identity verification once face is reliably held in frame
  const triggerIdentityVerification = useCallback(
    async (captureData, score) => {
      if (!faceDetectedRef.current || !captureData) {
        setStatus(AUTH_STATES.NO_FACE)
        statusRef.current = AUTH_STATES.NO_FACE
        setErrorMessage('A human face must be detected before scanning can begin.')
        return
      }

      setStatus(AUTH_STATES.VERIFYING)
      statusRef.current = AUTH_STATES.VERIFYING
      setErrorMessage('')

      try {
        const result = await faceAuthenticationService.verifyBiometricIdentity({
          userId,
          faceCaptureData: captureData,
          detectionConfidence: score,
          registrationMode,
        })

        if (!isScanningRef.current) return

        if (result.verified) {
          setStatus(AUTH_STATES.SUCCESS)
          statusRef.current = AUTH_STATES.SUCCESS
          setConfidence(Math.round(result.confidenceScore || 98))
          stopAll()
          onVerificationComplete?.(result)
        } else {
          setStatus(AUTH_STATES.FAILURE)
          statusRef.current = AUTH_STATES.FAILURE
          setErrorMessage(result.error || 'Face verification failed. Please try again.')
          onVerificationComplete?.(null)
        }
      } catch (err) {
        if (!isScanningRef.current) return
        setStatus(AUTH_STATES.FAILURE)
        statusRef.current = AUTH_STATES.FAILURE
        setErrorMessage(err.message || 'Face verification failed. Please try again.')
        onVerificationComplete?.(null)
      }
    },
    [userId, onVerificationComplete, registrationMode, stopAll]
  )

  // Start camera and continuous face detection loop
  const startCamera = async () => {
    isScanningRef.current = true
    stopAll()
    setErrorMessage('')
    setHoldProgress(0)
    setConfidence(0)
    faceDetectedRef.current = false
    setStatus(AUTH_STATES.REQUESTING_CAMERA)
    statusRef.current = AUTH_STATES.REQUESTING_CAMERA

    try {
      const stream = await faceDetectionService.startCamera(videoRef.current)

      if (!isScanningRef.current) {
        // User cancelled while camera was initializing
        faceDetectionService.stopCamera(stream)
        return
      }

      streamRef.current = stream
      setStatus(AUTH_STATES.NO_FACE)
      statusRef.current = AUTH_STATES.NO_FACE

      let consecutiveDetections = 0
      let lastCapture = null
      let lastScore = 80

      const runDetection = async () => {
        if (
          !isScanningRef.current ||
          !videoRef.current ||
          statusRef.current === AUTH_STATES.SUCCESS
        ) {
          return
        }

        try {
          const detection = await faceDetectionService.detectFaceInFrame(
            videoRef.current,
            canvasRef.current
          )

          if (!isScanningRef.current) return

          if (detection.reason && detection.reason !== 'Video feed not ready') {
            setErrorMessage(detection.reason)
          }

          const hasCenteredHumanFace = detection.detected && detection.centered

          if (hasCenteredHumanFace) {
            faceDetectedRef.current = true
            consecutiveDetections++
            lastScore = detection.confidence
            lastCapture = detection.captureDataUrl
            setConfidence(detection.confidence)

            if (consecutiveDetections > 3) {
              if (
                statusRef.current !== AUTH_STATES.FACE_DETECTED &&
                statusRef.current !== AUTH_STATES.VERIFYING &&
                statusRef.current !== AUTH_STATES.SUCCESS
              ) {
                setStatus(AUTH_STATES.FACE_DETECTED)
                statusRef.current = AUTH_STATES.FACE_DETECTED
              }

              setHoldProgress(prev => {
                const next = Math.min(100, prev + 18)
                if (
                  next >= 100 &&
                  statusRef.current !== AUTH_STATES.VERIFYING &&
                  statusRef.current !== AUTH_STATES.SUCCESS
                ) {
                  triggerIdentityVerification(lastCapture, lastScore)
                }
                return next
              })
            }
          } else {
            faceDetectedRef.current = false
            consecutiveDetections = Math.max(0, consecutiveDetections - 1)
            setHoldProgress(prev => Math.max(0, prev - 10))

            if (
              statusRef.current !== AUTH_STATES.VERIFYING &&
              statusRef.current !== AUTH_STATES.SUCCESS &&
              statusRef.current !== AUTH_STATES.NO_FACE
            ) {
              setStatus(AUTH_STATES.NO_FACE)
              statusRef.current = AUTH_STATES.NO_FACE
            }
          }
        } catch {
          // Keep loop running on transient frame drops
        }

        if (
          isScanningRef.current &&
          statusRef.current !== AUTH_STATES.SUCCESS &&
          statusRef.current !== AUTH_STATES.VERIFYING &&
          streamRef.current
        ) {
          detectionLoopRef.current = requestAnimationFrame(runDetection)
        }
      }

      // Initial delay to let camera warm up
      setTimeout(() => {
        if (isScanningRef.current) {
          detectionLoopRef.current = requestAnimationFrame(runDetection)
        }
      }, 400)
    } catch (err) {
      if (!isScanningRef.current) return
      setStatus(AUTH_STATES.CAMERA_DENIED)
      statusRef.current = AUTH_STATES.CAMERA_DENIED
      setErrorMessage(err.message || 'Camera access is required for biometric authentication.')
    }
  }

  // Helper for status text and badges
  const renderStatus = () => {
    switch (status) {
      case AUTH_STATES.IDLE:
        return {
          tone: 'neutral',
          text: 'Face authentication required',
          desc: 'Start the camera. Biometric scanning begins only after a centered human face is detected.',
          icon: ScanFace,
        }
      case AUTH_STATES.REQUESTING_CAMERA:
        return {
          tone: 'loading',
          text: 'Requesting camera access...',
          desc: 'Please allow camera permission in your browser prompt.',
          icon: RefreshCw,
        }
      case AUTH_STATES.NO_FACE:
        return {
          tone: 'warning',
          text: 'No face detected. Position your face inside the frame.',
          desc: errorMessage || 'Ensure your room is well lit and look directly into the camera.',
          icon: Eye,
        }
      case AUTH_STATES.FACE_DETECTED:
        return {
          tone: 'info',
          text: 'Face detected. Hold still...',
          desc: `Hold steady while biometric landmark analysis executes (${holdProgress}%).`,
          icon: ShieldCheck,
        }
      case AUTH_STATES.VERIFYING:
        return {
          tone: 'loading',
          text: 'Verifying identity...',
          desc: 'Matching biometric vectors against enrolled investigator credentials.',
          icon: RefreshCw,
        }
      case AUTH_STATES.SUCCESS:
        return {
          tone: 'success',
          text: registrationMode ? 'Face registered successfully ✓' : 'Face verified successfully ✓',
          desc: registrationMode
            ? `Biometric profile created for ${userId || 'this account'} (${confidence || 98}% confidence).`
            : `Officer identity authenticated (${confidence || 98}% biometric confidence).`,
          icon: CheckCircle2,
        }
      case AUTH_STATES.FAILURE:
        return {
          tone: 'error',
          text: 'Face verification failed. Please try again.',
          desc: errorMessage || 'Biometric matching threshold was not met.',
          icon: AlertCircle,
        }
      case AUTH_STATES.CAMERA_DENIED:
        return {
          tone: 'error',
          text: 'Camera access is required',
          desc: errorMessage || 'Camera permission denied or camera device unavailable.',
          icon: VideoOff,
        }
      default:
        return {
          tone: 'neutral',
          text: 'Face authentication required',
          desc: '',
          icon: ScanFace,
        }
    }
  }

  const currentStatus = renderStatus()
  const StatusIcon = currentStatus.icon
  const isCameraLive =
    status === AUTH_STATES.REQUESTING_CAMERA ||
    status === AUTH_STATES.NO_FACE ||
    status === AUTH_STATES.FACE_DETECTED ||
    status === AUTH_STATES.VERIFYING

  return (
    <div className="face-auth-container">
      <div className="face-auth-header">
        <div className="face-auth-title-row">
          <ScanFace className="face-auth-main-icon" size={20} />
          <div>
            <h3>{registrationMode ? 'Face Registration' : 'Face Authentication'}</h3>
            <p>{registrationMode ? 'Create a biometric profile for this account' : 'Second-factor biometric identity validation'}</p>
          </div>
        </div>

        <span className={`face-status-badge ${currentStatus.tone}`}>
          <StatusIcon
            size={14}
            className={currentStatus.tone === 'loading' ? 'spin' : ''}
          />
          {currentStatus.text}
        </span>
      </div>

      {/* Camera Viewport / Frame */}
      <div className={`camera-frame-wrapper ${currentStatus.tone} ${isCameraLive ? 'live' : ''}`}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`camera-video-element ${isCameraLive ? 'active' : 'hidden'}`}
        />
        <canvas ref={canvasRef} className="camera-canvas-element" style={{ display: 'none' }} />

        {/* Placeholder when camera is inactive */}
        {!isCameraLive && status !== AUTH_STATES.SUCCESS && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-graphic">
              <Camera size={38} />
            </div>
            <p>Webcam verification container</p>
            <small>Live feed is encrypted and analyzed locally in memory.</small>
          </div>
        )}

        {/* Verified Success Overlay */}
        {status === AUTH_STATES.SUCCESS && (
          <div className="camera-success-card">
            <div className="success-check-badge">
              <CheckCircle2 size={44} />
            </div>
            <h4>{registrationMode ? 'Face Profile Registered' : 'Biometric Factor Approved'}</h4>
            <p>{registrationMode ? 'Face registration completed successfully' : 'Identity confirmed with high confidence'}</p>
            <div className="success-metric-row">
              <span>Confidence: <b>{confidence || 98.4}%</b></span>
              <span>Method: <b>Facial Geometry</b></span>
            </div>
          </div>
        )}

        {/* Active Scanning Guides & Animation */}
        {isCameraLive && (
          <div className="face-detection-overlay">
            <div className={`face-guide-oval ${status === AUTH_STATES.FACE_DETECTED ? 'detected' : ''}`}>
              <div className="corner top-left" />
              <div className="corner top-right" />
              <div className="corner bottom-left" />
              <div className="corner bottom-right" />
            </div>

            {/* Vertical scanning laser sweep */}
            {(status === AUTH_STATES.FACE_DETECTED || status === AUTH_STATES.VERIFYING) && (
              <div className="scanning-laser-line" />
            )}

            {/* Hold progress bar */}
            {status === AUTH_STATES.FACE_DETECTED && (
              <div className="face-hold-meter">
                <div className="meter-fill" style={{ width: `${holdProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description & Action Bar */}
      <div className="face-action-bar">
        <p className="status-description">{currentStatus.desc}</p>

        <div className="face-btn-row">
          {isCameraLive ? (
            <button
              type="button"
              className="button secondary face-stop-btn"
              onClick={handleCancelScan}
            >
              <VideoOff size={16} />
              Cancel Scan
            </button>
          ) : status === AUTH_STATES.SUCCESS ? (
            <button
              type="button"
              className="button secondary face-rescan-btn"
              onClick={startCamera}
              disabled={disabled}
            >
              <RefreshCw size={15} />
              Re-scan Face
            </button>
          ) : status === AUTH_STATES.FAILURE || status === AUTH_STATES.CAMERA_DENIED ? (
            <button
              type="button"
              className="button primary face-trigger-btn"
              onClick={startCamera}
              disabled={disabled}
            >
              <RefreshCw size={15} />
              Try Face Scan Again
            </button>
          ) : (
            <button
              type="button"
              className="button primary face-trigger-btn"
              onClick={startCamera}
              disabled={disabled}
            >
              <Camera size={16} />
              Scan Your Face
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
