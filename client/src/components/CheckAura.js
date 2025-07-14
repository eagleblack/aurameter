import React, { useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import axios from 'axios';
import './CheckAura.css';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Add at top with imports

const CheckAura = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [ref, inView] = useInView({ threshold: 0.1 });
  const resultRef = useRef(null);
  const [disappearing,setDisappearing]=useState(false)
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
const analyzeAura = async () => {
  if (!selectedImage) {
    setError('Please select an image first');
    return;
  }

  setIsAnalyzing(true);
  setError(null);

  try {
    const genAI = new GoogleGenerativeAI("AIzaSyARTX_53brqXUTD18Z-Kf1gmhepRKYHx7Y");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert image to base64 using a Promise
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(selectedImage);
    });

    // Now call Gemini
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `This is a user's image. 
Please return a JSON object in this format:
{
  "auraPoints": number between 10 and 100,
  "compliment": short string the image's energy with upmost honesty,
  "explantaion": Why you said what you said in less than 100 letters?
}
Only return the JSON.`,
            },
            {
              inlineData: {
                data: base64Image,
                mimeType: selectedImage.type,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();

    // Extract JSON safely
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonString = text.substring(jsonStart, jsonEnd + 1);

    try {
      const data = JSON.parse(jsonString);
      setAnalysisResult(data);
    } catch (e) {
      console.error("JSON parse error:", e);
      setError("AI response couldn't be parsed. Try a different image.");
    }
  } catch (err) {
    console.error("Gemini error:", err);
    setError("Failed to analyze. Try again later.");
  } finally {
    setIsAnalyzing(false); // ✅ Now this runs only after Gemini completes
  }
};


 const handleDownloadImage = async () => {
  if (!resultRef.current) return;

  setDisappearing(true);

  // Wait for the DOM to reflect the change
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

  const canvas = await html2canvas(resultRef.current, {
    backgroundColor: "#151a2b",
    scale: window.devicePixelRatio || 2,
  });

  setDisappearing(false);

  const link = document.createElement("a");
  link.download = "aurameter-aura-analysis.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

  const resetForm = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

       return (
        <div className="check-aura-page" style={{marginTop:30}}>
          <div className="container mx-auto">
            <div className="aura-content" ref={ref}>
              <div className={`aura-header ${inView ? 'animate-fade-in-up' : ''}`}>
                <h1 className="text-5xl font-bold mb-4">🔮 Check Your Aura</h1>
                <p className="text-lg text-gray-400 max-w-xl mx-auto">Upload a photo and discover your energy signature</p>
              </div>

              <div className="aura-form-container">
                {!analysisResult ? (
                  <div className={`aura-form ${inView ? 'animate-fade-in-up' : ''}`}>
                    <div 
                      className={`upload-area ${previewUrl ? 'has-image' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewUrl ? (
                        <div className="image-preview">
                          <img src={previewUrl} alt="Preview" />
                          <div className="preview-overlay">
                            <span>Click to change image</span>
                          </div>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <div className="upload-icon">📸</div>
                          <h3 className="text-xl font-semibold">Upload Your Photo</h3>
                          <p>Drag & drop or click to select an image</p>
                          <span className="upload-hint">Supports JPG, PNG, GIF (max 5MB)</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      style={{display:'none'}}
                    />

                    {error && (
                      <div className="error-message">
                        <span>⚠️ {error}</span>
                      </div>
                    )}

                    <div className="form-actions">
              <button
  onClick={analyzeAura}
  disabled={!selectedImage || isAnalyzing}
  className={`btn-primary analyze-btn text-white font-semibold py-3 px-3 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
    !selectedImage || isAnalyzing
      ? 'bg-indigo-400 cursor-not-allowed opacity-50'
      : 'bg-indigo-600 hover:bg-indigo-500'
  }`}
>
  {isAnalyzing ? (
    <>
      <span className="loading-spinner "></span>
    
    </>
  ) : (
    '🔮 Analyze My Aura'
  )}
</button>
                    </div>
                  </div>
                ) : (
                   <div
  ref={resultRef}
  className={`analysis-result ${inView ? 'animate-fade-in-up' : ''}`}
  style={{
    width: '100%',
    maxWidth: '460px',
    margin: '0 auto',
    borderRadius: '24px',
    padding: '2rem 1.5rem',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 16px 40px rgba(139, 92, 246, 0.25)',
    position: 'relative',
    overflow: 'hidden',
  }}
>
  <div style={{ textAlign: 'center', marginBottom: 20 }}>
    <h2
      style={{
        fontSize: '2.2rem',
        fontWeight: 800,
        background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      ✨ Aurameter
    </h2>
    <p style={{ color: '#cbd5e1', fontWeight: 500, marginTop: 4 }}>Your Aura Analysis</p>
  </div>

  {previewUrl && (
    <div
      style={{
        margin: '0 auto 24px',
        width: 140,
        height: 140,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '4px solid rgba(139,92,246,0.5)',
        boxShadow: '0 0 20px rgba(139,92,246,0.4)',
      }}
    >
      <img
        src={previewUrl}
        alt="Uploaded"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )}

  <div
    style={{
      background: 'rgba(139,92,246,0.08)',
      borderRadius: 16,
      padding: '1.2rem',
      marginBottom: 16,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 28, marginBottom: 10 }}>💫</div>
    <h3 style={{ color: '#c084fc', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
      Your Energy
    </h3>
    <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 500 }}>{analysisResult.compliment}</p>
  </div>

  <div
    style={{
      background: 'rgba(6,182,212,0.10)',
      borderRadius: 16,
      padding: '1.2rem',
      marginBottom: 16,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 28, marginBottom: 10 }}>🌟</div>
    <h3 style={{ color: '#06b6d4', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
      Aura Points
    </h3>
    <div style={{ fontSize: 40, fontWeight: 800, color: '#a78bfa' }}>
      {analysisResult.auraPoints}
    </div>
    <span style={{ color: '#94a3b8', fontWeight: 500 }}>energy points</span>
  </div>

  {analysisResult.explantaion && (
    <div
      style={{
        background: 'linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        borderLeft: '4px solid #facc15',
        borderRadius: 12,
        padding: '1rem 1.2rem',
        marginBottom: 16,
      }}
    >
     
      <p style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.5 }}>
        {analysisResult.explantaion}
      </p>
    </div>
  )}
                  {disappearing?"": <div style={{ textAlign: 'center', marginTop: 24 }}>
                      <button
                        onClick={handleDownloadImage}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                        style={{ fontWeight: 700, fontSize: 16, padding: '0.8rem 2rem', borderRadius: 12 }}
                      >
                        📥 Download Result
                      </button>
                      <button
                        onClick={resetForm}
                        className="btn-secondary bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 mt-2"
                        style={{ fontWeight: 700, fontSize: 16,marginTop:30, padding: '0.8rem 2rem', borderRadius: 12 }}
                      >
                        🔄 Try Another Image
                      </button>
                    </div>}
                   
                  </div>
                )}
              </div>

              <div className={`aura-info ${inView ? 'animate-fade-in-up' : ''}`}>
                <h3 className="text-3xl font-bold mb-6">How It Works</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">📸</div>
                    <h4 className="text-lg font-semibold">Upload Photo</h4>
                    <p>Share a clear photo of yourself</p>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">🤖</div>
                    <h4 className="text-lg font-semibold">AI Analysis</h4>
                    <p>Our AI reads your energy signature</p>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">✨</div>
                    <h4 className="text-lg font-semibold">Get Results</h4>
                    <p>Discover your aura and energy points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

  
};

export default CheckAura; 
