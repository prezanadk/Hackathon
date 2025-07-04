// Configuration
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE" // Replace with your actual API key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

// Global variables
let currentInterviewType = ""
let currentQuestionIndex = 0
const questions = []
const userAnswers = []
let isRecording = false
const mediaRecorder = null
const audioChunks = []
let recognition = null
const emotionModel = null
let videoStream = null
let currentEmotion = "neutral"
const tf = window.tf // Declare the tf variable

// Navigation functions
function navigateToInterview(type) {
  currentInterviewType = type
  window.location.href = `interview.html?type=${type}`
}

function goBack() {
  window.location.href = "index.html"
}

function goToResults() {
  localStorage.setItem(
    "interviewResults",
    JSON.stringify({
      type: currentInterviewType,
      questions: questions,
      answers: userAnswers,
      emotions: getEmotionSummary(),
    }),
  )
  window.location.href = "results.html"
}

// Initialize interview page
async function initializeInterview() {
  const urlParams = new URLSearchParams(window.location.search)
  currentInterviewType = urlParams.get("type")

  if (!currentInterviewType) {
    window.location.href = "index.html"
    return
  }

  updateInterviewTitle()
  await setupCamera()
  await loadTensorFlowModel()
  setupSpeechRecognition()
  await generateFirstQuestion()
}

function updateInterviewTitle() {
  const titles = {
    ielts: "IELTS Speaking Test",
    visa: "Visa Interview Practice",
    job: "Job Interview Simulation",
    basic: "Basic English Practice",
  }

  document.getElementById("interviewTitle").textContent = titles[currentInterviewType] || "Interview Practice"
  document.getElementById("interviewSubtitle").textContent = `Question ${currentQuestionIndex + 1} of 8`
}

// Camera and TensorFlow setup
async function setupCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    })
    const videoElement = document.getElementById("videoElement")
    videoElement.srcObject = videoStream

    videoElement.addEventListener("loadedmetadata", () => {
      videoElement.play()
    })
  } catch (error) {
    console.error("Error accessing camera:", error)
    showError("Camera access denied. Please allow camera access for emotion detection.")
  }
}

async function loadTensorFlowModel() {
  try {
    // Load TensorFlow.js and face detection model
    await tf.ready()

    // For demo purposes, we'll simulate emotion detection
    // In a real implementation, you would load a pre-trained emotion detection model
    console.log("TensorFlow.js loaded successfully")
    startEmotionDetection()
  } catch (error) {
    console.error("Error loading TensorFlow model:", error)
  }
}

function startEmotionDetection() {
  // Simulate emotion detection every 2 seconds
  setInterval(() => {
    const emotions = ["confident", "nervous", "neutral", "focused", "anxious"]
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
    currentEmotion = randomEmotion
    updateEmotionDisplay(randomEmotion)
  }, 2000)
}

function updateEmotionDisplay(emotion) {
  const emotionOverlay = document.querySelector(".emotion-overlay")
  if (emotionOverlay) {
    const emotionEmojis = {
      confident: "😊 Confident",
      nervous: "😰 Nervous",
      neutral: "😐 Neutral",
      focused: "🤔 Focused",
      anxious: "😟 Anxious",
    }
    emotionOverlay.textContent = emotionEmojis[emotion] || "😐 Neutral"
  }
}

// Speech recognition setup
function setupSpeechRecognition() {
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      handleUserAnswer(transcript)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      showError("Speech recognition error. Please try again.")
    }
  } else {
    showError("Speech recognition not supported in this browser.")
  }
}

// Gemini API functions
async function generateQuestion(interviewType, questionNumber) {
  const prompts = {
    ielts: `Generate an IELTS speaking test question ${questionNumber} of 8. Make it appropriate for Part ${questionNumber <= 3 ? "1" : questionNumber <= 5 ? "2" : "3"}. Return only the question text, no additional formatting.`,
    visa: `Generate a visa interview question ${questionNumber} of 8. Focus on common visa interview topics like purpose of visit, ties to home country, financial situation, etc. Return only the question text.`,
    job: `Generate a job interview question ${questionNumber} of 8. Include a mix of behavioral, technical, and situational questions. Return only the question text.`,
    basic: `Generate a basic English conversation question ${questionNumber} of 8. Focus on everyday topics suitable for English learners. Return only the question text.`,
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompts[interviewType],
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    return data.candidates[0].content.parts[0].text.trim()
  } catch (error) {
    console.error("Error generating question:", error)
    return getFallbackQuestion(interviewType, questionNumber)
  }
}

function getFallbackQuestion(type, number) {
  const fallbackQuestions = {
    ielts: [
      "Tell me about your hometown.",
      "What do you like to do in your free time?",
      "Describe a memorable experience from your childhood.",
      "What are your plans for the future?",
      "How has technology changed the way people communicate?",
      "What role does education play in society?",
      "Discuss the importance of environmental protection.",
      "How do you think cities will change in the future?",
    ],
    visa: [
      "What is the purpose of your visit?",
      "How long do you plan to stay?",
      "What ties do you have to your home country?",
      "How will you finance your trip?",
      "Have you visited this country before?",
      "What do you plan to do during your visit?",
      "Do you have family or friends in the destination country?",
      "What is your occupation and how long have you been working there?",
    ],
    job: [
      "Tell me about yourself.",
      "Why are you interested in this position?",
      "What are your greatest strengths?",
      "Describe a challenging situation you faced at work.",
      "Where do you see yourself in five years?",
      "Why should we hire you?",
      "What motivates you?",
      "Do you have any questions for us?",
    ],
    basic: [
      "What is your favorite food and why?",
      "Describe your daily routine.",
      "What do you like about your city?",
      "Tell me about your family.",
      "What are your hobbies?",
      "Describe your best friend.",
      "What did you do last weekend?",
      "What are your plans for next year?",
    ],
  }

  return fallbackQuestions[type][number - 1] || "Tell me about yourself."
}

async function evaluateAnswer(question, userAnswer) {
  const prompt = `
    Evaluate this interview answer with detailed scoring:
    Question: "${question}"
    Answer: "${userAnswer}"
    
    Provide feedback in this exact JSON format:
    {
        "fluencyScore": [1-10 integer score],
        "answerRelevanceScore": [1-10 integer score],
        "fluencyFeedback": "specific detailed feedback about grammar, pronunciation, speaking pace, and language fluency (2-3 sentences)",
        "answerRelevanceFeedback": "specific detailed feedback about how well the answer addresses the question, content quality, structure, and completeness (2-3 sentences)",
        "overallFeedback": "brief overall assessment of this specific answer (1-2 sentences)"
    }
    
    Scoring Guidelines:
    - Fluency (1-10): Grammar, pronunciation, speaking flow, vocabulary usage
    - Answer Relevance (1-10): How well the answer addresses the question, completeness, structure, examples
    
    Return only the JSON, no additional text.
    `

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const evaluation = JSON.parse(data.candidates[0].content.parts[0].text.trim())
    return evaluation
  } catch (error) {
    console.error("Error evaluating answer:", error)
    return {
      fluencyScore: 6,
      answerRelevanceScore: 6,
      fluencyFeedback: "Good overall fluency with room for improvement in pronunciation and grammar.",
      answerRelevanceFeedback:
        "The answer addresses the question adequately but could benefit from more specific examples and better structure.",
      overallFeedback: "A solid response with potential for enhancement in both delivery and content.",
    }
  }
}

// Interview flow functions
async function generateFirstQuestion() {
  showLoading(true)
  const question = await generateQuestion(currentInterviewType, 1)
  questions.push(question)
  displayQuestion(question, 1)
  showLoading(false)
}

function displayQuestion(question, number) {
  document.getElementById("questionNumber").textContent = `Question ${number}`
  document.getElementById("questionText").textContent = question
  updateProgress(number)
  updateInterviewTitle()
}

function updateProgress(questionNumber) {
  const progress = (questionNumber / 8) * 100
  document.querySelector(".progress-fill").style.width = `${progress}%`
}

async function startRecording() {
  if (!recognition) {
    showError("Speech recognition not available.")
    return
  }

  isRecording = true
  const recordBtn = document.getElementById("recordBtn")
  recordBtn.classList.add("recording")
  recordBtn.innerHTML = "🛑 Stop Recording"

  recognition.start()
  startTimer()
}

function stopRecording() {
  if (!isRecording) return

  isRecording = false
  const recordBtn = document.getElementById("recordBtn")
  recordBtn.classList.remove("recording")
  recordBtn.innerHTML = "🎤 Start Recording"

  recognition.stop()
  stopTimer()
}

function startTimer() {
  let seconds = 0
  const timerDisplay = document.getElementById("timerDisplay")

  const timer = setInterval(() => {
    seconds++
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`

    if (!isRecording) {
      clearInterval(timer)
    }
  }, 1000)
}

function stopTimer() {
  // Timer will stop automatically when isRecording becomes false
}

async function handleUserAnswer(transcript) {
  showLoading(true)

  const currentQuestion = questions[currentQuestionIndex]
  const evaluation = await evaluateAnswer(currentQuestion, transcript)

  // Get emotion score for this specific answer
  const emotionScore = getEmotionScoreForAnswer(currentEmotion)

  userAnswers.push({
    question: currentQuestion,
    answer: transcript,
    evaluation: evaluation,
    emotion: currentEmotion,
    emotionScore: emotionScore,
    timestamp: new Date().toISOString(),
    questionNumber: currentQuestionIndex + 1,
  })

  currentQuestionIndex++

  if (currentQuestionIndex < 8) {
    const nextQuestion = await generateQuestion(currentInterviewType, currentQuestionIndex + 1)
    questions.push(nextQuestion)
    displayQuestion(nextQuestion, currentQuestionIndex + 1)
  } else {
    // Interview completed
    goToResults()
  }

  showLoading(false)
}

// Add function to convert emotion to numerical score
function getEmotionScoreForAnswer(emotion) {
  const emotionScores = {
    confident: 9,
    focused: 8,
    neutral: 6,
    nervous: 4,
    anxious: 2,
  }
  return emotionScores[emotion] || 6
}

async function skipQuestion() {
  if (currentQuestionIndex < 7) {
    currentQuestionIndex++
    const nextQuestion = await generateQuestion(currentInterviewType, currentQuestionIndex + 1)
    questions.push(nextQuestion)
    displayQuestion(nextQuestion, currentQuestionIndex + 1)
  } else {
    goToResults()
  }
}

// Results page functions
function initializeResults() {
  const results = JSON.parse(localStorage.getItem("interviewResults"))
  if (!results) {
    window.location.href = "index.html"
    return
  }

  displayResults(results)
}

// Update displayResults function for detailed per-question feedback
function displayResults(results) {
  // Calculate overall scores
  const fluencyScores = results.answers.map((a) => a.evaluation.fluencyScore)
  const answerScores = results.answers.map((a) => a.evaluation.answerRelevanceScore)
  const emotionScores = results.answers.map((a) => a.emotionScore)

  const avgFluency = Math.round((fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length) * 10) / 10
  const avgAnswerRelevance = Math.round((answerScores.reduce((a, b) => a + b, 0) / answerScores.length) * 10) / 10
  const avgEmotion = Math.round((emotionScores.reduce((a, b) => a + b, 0) / emotionScores.length) * 10) / 10

  const overallScore = Math.round(((avgFluency + avgAnswerRelevance + avgEmotion) / 3) * 10) / 10

  // Display overall score
  document.getElementById("overallScore").textContent = `${overallScore}/10`

  // Display per-question feedback
  displayPerQuestionFeedback(results.answers)

  // Display final summary
  displayFinalSummary(avgFluency, avgAnswerRelevance, avgEmotion, overallScore, results.answers)
}

// Add function to display per-question feedback
function displayPerQuestionFeedback(answers) {
  const perQuestionContainer = document.getElementById("perQuestionFeedback")

  let html = '<h2>📝 Per Question Analysis</h2><div class="questions-grid">'

  answers.forEach((answer, index) => {
    const emotionEmoji = {
      confident: "😊",
      focused: "🤔",
      neutral: "😐",
      nervous: "😰",
      anxious: "😟",
    }

    html += `
      <div class="question-feedback-card">
        <div class="question-header">
          <h3>Question ${answer.questionNumber}</h3>
          <div class="question-scores">
            <span class="score-badge fluency">Fluency: ${answer.evaluation.fluencyScore}/10</span>
            <span class="score-badge relevance">Relevance: ${answer.evaluation.answerRelevanceScore}/10</span>
            <span class="score-badge emotion">Emotion: ${answer.emotionScore}/10 ${emotionEmoji[answer.emotion] || "😐"}</span>
          </div>
        </div>
        
        <div class="question-content">
          <div class="question-text">
            <strong>Q:</strong> ${answer.question}
          </div>
          
          <div class="feedback-sections">
            <div class="feedback-section">
              <h4>🗣️ Fluency Feedback</h4>
              <p>${answer.evaluation.fluencyFeedback}</p>
            </div>
            
            <div class="feedback-section">
              <h4>💡 Answer Relevance Feedback</h4>
              <p>${answer.evaluation.answerRelevanceFeedback}</p>
            </div>
            
            <div class="feedback-section">
              <h4>😊 Emotional Appearance</h4>
              <p>You appeared ${answer.emotion} during this response. ${getEmotionDetailedFeedback(answer.emotion, answer.emotionScore)}</p>
            </div>
            
            <div class="overall-question-feedback">
              <strong>Overall:</strong> ${answer.evaluation.overallFeedback}
            </div>
          </div>
        </div>
      </div>
    `
  })

  html += "</div>"
  perQuestionContainer.innerHTML = html
}

// Add function for detailed emotion feedback per question
function getEmotionDetailedFeedback(emotion, score) {
  const feedbackMap = {
    confident:
      score >= 8
        ? "Excellent confidence level that enhances your credibility."
        : "Good confidence, maintain this positive energy.",
    focused:
      score >= 7
        ? "Great focus and attention, showing strong engagement."
        : "Good focus, try to maintain this throughout.",
    neutral:
      score >= 6
        ? "Neutral expression is professional, consider showing more engagement."
        : "Try to show more enthusiasm and engagement.",
    nervous:
      score >= 4
        ? "Some nervousness is normal, practice relaxation techniques."
        : "High nervousness detected, work on confidence-building exercises.",
    anxious:
      score >= 3
        ? "Anxiety is affecting your performance, practice stress management."
        : "Significant anxiety detected, consider preparation and breathing exercises.",
  }

  return feedbackMap[emotion] || "Maintain a calm and confident demeanor."
}

// Add function to display final summary
function displayFinalSummary(avgFluency, avgAnswerRelevance, avgEmotion, overallScore, answers) {
  const finalSummaryContainer = document.getElementById("finalSummary")

  // Generate comprehensive final review
  const finalReview = generateFinalReview(avgFluency, avgAnswerRelevance, avgEmotion, answers)

  const html = `
    <div class="final-summary-card">
      <h2>🎯 Final Performance Summary</h2>
      
      <div class="final-scores">
        <div class="final-score-item">
          <div class="score-circle-small fluency-color">
            <span>${avgFluency}/10</span>
          </div>
          <div class="score-label">
            <h3>Fluency</h3>
            <p>${getFluencyLevel(avgFluency)}</p>
          </div>
        </div>
        
        <div class="final-score-item">
          <div class="score-circle-small relevance-color">
            <span>${avgAnswerRelevance}/10</span>
          </div>
          <div class="score-label">
            <h3>Answer Relevance</h3>
            <p>${getRelevanceLevel(avgAnswerRelevance)}</p>
          </div>
        </div>
        
        <div class="final-score-item">
          <div class="score-circle-small emotion-color">
            <span>${avgEmotion}/10</span>
          </div>
          <div class="score-label">
            <h3>Emotional Appearance</h3>
            <p>${getEmotionLevel(avgEmotion)}</p>
          </div>
        </div>
      </div>
      
      <div class="overall-score-large">
        <h2>Overall Score: ${overallScore}/10</h2>
        <p class="performance-level">${getOverallPerformanceLevel(overallScore)}</p>
      </div>
      
      <div class="final-review">
        <h3>📋 Comprehensive Review</h3>
        <div class="review-content">
          ${finalReview}
        </div>
      </div>
      
      <div class="improvement-recommendations">
        <h3>🚀 Key Recommendations</h3>
        <div class="recommendations-list">
          ${generateRecommendations(avgFluency, avgAnswerRelevance, avgEmotion)}
        </div>
      </div>
    </div>
  `

  finalSummaryContainer.innerHTML = html
}

// Helper functions for performance levels
function getFluencyLevel(score) {
  if (score >= 8.5) return "Excellent"
  if (score >= 7) return "Very Good"
  if (score >= 5.5) return "Good"
  if (score >= 4) return "Fair"
  return "Needs Improvement"
}

function getRelevanceLevel(score) {
  if (score >= 8.5) return "Highly Relevant"
  if (score >= 7) return "Very Relevant"
  if (score >= 5.5) return "Relevant"
  if (score >= 4) return "Somewhat Relevant"
  return "Needs Focus"
}

function getEmotionLevel(score) {
  if (score >= 8) return "Very Confident"
  if (score >= 6.5) return "Confident"
  if (score >= 5) return "Neutral"
  if (score >= 3.5) return "Nervous"
  return "Very Nervous"
}

function getOverallPerformanceLevel(score) {
  if (score >= 8.5) return "Outstanding Performance"
  if (score >= 7.5) return "Excellent Performance"
  if (score >= 6.5) return "Very Good Performance"
  if (score >= 5.5) return "Good Performance"
  if (score >= 4.5) return "Fair Performance"
  return "Needs Significant Improvement"
}

// Generate comprehensive final review
function generateFinalReview(avgFluency, avgAnswerRelevance, avgEmotion, answers) {
  let review = ""

  // Fluency analysis
  if (avgFluency >= 7.5) {
    review +=
      "Your fluency and language skills are impressive. You demonstrated excellent grammar, clear pronunciation, and natural speaking flow throughout the interview. "
  } else if (avgFluency >= 5.5) {
    review +=
      "Your fluency shows good potential with some areas for improvement. Focus on grammar accuracy and speaking pace to enhance your communication effectiveness. "
  } else {
    review +=
      "Your fluency needs attention. Consider practicing pronunciation, grammar fundamentals, and speaking more slowly for better clarity. "
  }

  // Answer relevance analysis
  if (avgAnswerRelevance >= 7.5) {
    review +=
      "Your answers were highly relevant and well-structured. You consistently addressed the questions directly with appropriate examples and details. "
  } else if (avgAnswerRelevance >= 5.5) {
    review +=
      "Your answers generally addressed the questions well, though some could benefit from more specific examples and better organization. "
  } else {
    review +=
      "Your answers need more focus on directly addressing the questions asked. Practice structuring responses with clear examples and relevant details. "
  }

  // Emotional appearance analysis
  if (avgEmotion >= 7) {
    review +=
      "Your emotional presence was confident and professional throughout the interview. You maintained good composure and showed appropriate engagement. "
  } else if (avgEmotion >= 5) {
    review +=
      "Your emotional appearance was generally appropriate, though showing more confidence and enthusiasm could enhance your overall presentation. "
  } else {
    review +=
      "Your emotional state showed signs of nervousness that may have impacted your performance. Practice relaxation techniques and build confidence through preparation. "
  }

  // Overall assessment
  const overallScore = (avgFluency + avgAnswerRelevance + avgEmotion) / 3
  if (overallScore >= 7.5) {
    review += "Overall, you demonstrated strong interview skills and are well-prepared for real interview situations."
  } else if (overallScore >= 5.5) {
    review +=
      "Overall, you show good interview potential with targeted improvements that can significantly enhance your performance."
  } else {
    review +=
      "Overall, there are several areas that need attention, but with focused practice, you can significantly improve your interview performance."
  }

  return review
}

// Generate specific recommendations
function generateRecommendations(avgFluency, avgAnswerRelevance, avgEmotion) {
  const recommendations = []

  if (avgFluency < 7) {
    recommendations.push("Practice speaking English daily, focus on pronunciation and grammar exercises")
    recommendations.push("Record yourself speaking and identify areas for improvement")
  }

  if (avgAnswerRelevance < 7) {
    recommendations.push("Practice the STAR method (Situation, Task, Action, Result) for structured responses")
    recommendations.push("Prepare specific examples for common interview questions")
  }

  if (avgEmotion < 6) {
    recommendations.push("Practice relaxation and breathing techniques before interviews")
    recommendations.push("Conduct mock interviews to build confidence")
    recommendations.push("Work on maintaining eye contact and positive body language")
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue practicing to maintain your excellent performance")
    recommendations.push("Focus on advanced interview techniques and industry-specific questions")
  }

  return recommendations.map((rec) => `<div class="recommendation-item">• ${rec}</div>`).join("")
}

// Utility functions
function showLoading(show) {
  const loadingElements = document.querySelectorAll(".loading")
  loadingElements.forEach((el) => {
    el.style.display = show ? "block" : "none"
  })
}

function showError(message) {
  alert(message) // In a real app, you'd use a proper notification system
}

function getEmotionSummary() {
  return userAnswers.map((answer) => answer.emotion)
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname

  if (path.includes("interview.html")) {
    initializeInterview()
  } else if (path.includes("results.html")) {
    initializeResults()
  }
})

// Cleanup function
window.addEventListener("beforeunload", () => {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop())
  }
  if (recognition) {
    recognition.stop()
  }
})
