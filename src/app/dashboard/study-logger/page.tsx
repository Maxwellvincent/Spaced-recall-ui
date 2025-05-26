"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { Subject, Topic } from "@/types/study";
import { Loader2, Scroll, Flame, Brain, Star } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

interface LoggedStudySession {
  userId: string;
  subject: string;
  topic: string;
  duration: number;
  confidence: number;
  notes?: string;
  timestamp: Date;
  cardsReviewed?: number;
  newCards?: number;
  jutsuMastery?: {
    chakraControl: number;
    technique: number;
    understanding: number;
  };
}

interface WeakArea {
  subject: string;
  topic: Topic;
  confidence: number;
  lastReviewed: string;
  nextReview: string;
}

interface UserPreferences {
  theme: string;
  character?: string;
}

const JUTSU_DESCRIPTIONS = {
  chakraControl: "How well you can mold and control chakra during practice",
  technique: "The precision and effectiveness of your jutsu execution",
  understanding: "Your grasp of the underlying principles and theory"
};

export default function StudyLogger() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { theme } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState("");
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [newCards, setNewCards] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userCharacter, setUserCharacter] = useState<string | null>(null);
  const [jutsuMastery, setJutsuMastery] = useState({
    chakraControl: 50,
    technique: 50,
    understanding: 50
  });
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState("");
  const [showCreateConcept, setShowCreateConcept] = useState(false);
  const [newConceptName, setNewConceptName] = useState("");
  const [newConceptDescription, setNewConceptDescription] = useState("");
  const [creatingConcept, setCreatingConcept] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch subjects for the dropdown
    const fetchSubjects = async () => {
      try {
        const firestore = getFirebaseDb();
        const subjectsRef = collection(firestore, 'subjects');
        const q = query(subjectsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const subjectsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsList);
      } catch (err) {
        console.error('Error fetching subjects for study logger:', err);
      }
    };
    fetchSubjects();

    const fetchUserPreferences = async () => {
      try {
        const firestore = getFirebaseDb();
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserPreferences;
          setUserCharacter(userData.character || null);
        }
      } catch (err) {
        console.error('Error fetching user preferences:', err);
      }
    };

    fetchUserPreferences();
  }, [user]);

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in to log a study session");
      return;
    }

    if (!selectedSubject || !selectedTopic) {
      setError("Please select both a subject and topic");
      return;
    }

    try {
      console.log(`StudyLogger: Logging session for subject ${selectedSubject}, topic ${selectedTopic}`);
      
      // Get a fresh Firestore instance
      const firestore = getFirebaseDb();
      if (!firestore) {
        throw new Error("Failed to initialize Firestore");
      }
      
      // 1. Create and save the session log
      const sessionData: LoggedStudySession = {
        userId: user.uid,
        subject: selectedSubject,
        topic: selectedTopic,
        duration,
        confidence,
        notes,
        timestamp: new Date(),
        cardsReviewed,
        newCards,
        ...(theme.toLowerCase() === "naruto" && {
          jutsuMastery: {
            chakraControl: jutsuMastery.chakraControl,
            technique: jutsuMastery.technique,
            understanding: jutsuMastery.understanding
          }
        })
      };

      await addDoc(collection(firestore, "studySessions"), sessionData);
      console.log(`StudyLogger: Session logged successfully`);

      // 2. Find the corresponding subject document to update mastery
      try {
        console.log(`StudyLogger: Finding subject document for ${selectedSubject}`);
        
        // Find the subject document ID first
        const subjectsRef = collection(firestore, "subjects");
        const q = query(
          subjectsRef, 
          where("userId", "==", user.uid),
          where("name", "==", selectedSubject)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.warn(`StudyLogger: Subject not found in database: ${selectedSubject}`);
        } else {
          console.log(`StudyLogger: Found ${querySnapshot.size} matching subjects`);
          
          // Update each matching subject (should normally be just one)
          for (const docSnapshot of querySnapshot.docs) {
            console.log(`StudyLogger: Updating subject ${docSnapshot.id}`);
            
            const subjectData = docSnapshot.data() as Subject;
            const subjectId = docSnapshot.id;
            
            // Find the topic in the subject
            const topicIndex = subjectData.topics.findIndex(t => t.name === selectedTopic);
            
            if (topicIndex >= 0) {
              // Calculate mastery improvement based on confidence
              const masteryGained = Math.floor(confidence / 10);
              const currentMastery = subjectData.topics[topicIndex].masteryLevel || 0;
              const newMastery = Math.min(100, currentMastery + masteryGained);
              
              console.log(`StudyLogger: Topic found - current mastery: ${currentMastery}, new mastery: ${newMastery}`);
              
              // Create updated topics array
              const updatedTopics = [...subjectData.topics];
              updatedTopics[topicIndex] = {
                ...updatedTopics[topicIndex],
                masteryLevel: newMastery,
                lastStudied: new Date().toISOString()
              };
              
              // Calculate new average mastery
              let validTopicsCount = 0;
              let totalMastery = 0;
              
              updatedTopics.forEach(topic => {
                if (topic && typeof topic.masteryLevel === 'number') {
                  validTopicsCount++;
                  totalMastery += topic.masteryLevel;
                }
              });
              
              const avgMastery = validTopicsCount > 0 
                ? Math.floor(totalMastery / validTopicsCount) 
                : 0;
              
              const completedTopics = updatedTopics.filter(t => 
                (t && typeof t.masteryLevel === 'number' && t.masteryLevel >= 80)
              ).length;
              
              console.log(`StudyLogger: Calculated average mastery: ${avgMastery}%, completed topics: ${completedTopics}/${updatedTopics.length}`);
              
              // Update the subject document
              const subjectRef = doc(firestore, "subjects", subjectId);
              await updateDoc(subjectRef, {
                topics: updatedTopics,
                progress: {
                  ...subjectData.progress,
                  averageMastery: avgMastery,
                  completedTopics: completedTopics,
                  totalTopics: updatedTopics.length,
                  lastStudied: new Date().toISOString()
                }
              });
              
              console.log(`StudyLogger: Subject ${subjectId} updated successfully`);
            } else {
              console.warn(`StudyLogger: Topic '${selectedTopic}' not found in subject ${subjectId}`);
            }
          }
        }
      } catch (updateError) {
        console.error("StudyLogger: Error updating subject mastery:", updateError);
        // We don't fail the whole operation if update fails, just log the error
      }
      
      setMessage("Training session logged successfully! Your ninja way grows stronger!");
      
      // Reset form
      setSelectedSubject("");
      setSelectedTopic("");
      setDuration(30);
      setConfidence(50);
      setNotes("");
      setCardsReviewed(0);
      setNewCards(0);
      setJutsuMastery({
        chakraControl: 50,
        technique: 50,
        understanding: 50
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("StudyLogger: Error logging study session:", err);
      setError(`Failed to log training session: ${err.message || "Unknown error"}`);
    }
  };

  const handleCreateSubject = async () => {
    if (!user || !newSubjectName.trim()) return;
    setCreatingSubject(true);
    try {
      const firestore = getFirebaseDb();
      const newSubject = {
        name: newSubjectName.trim(),
        userId: user.uid,
        topics: [],
        xp: 0,
        level: 0,
        totalStudyTime: 0,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(firestore, "subjects"), newSubject);
      const created = { ...newSubject, id: docRef.id };
      setSubjects(prev => [...prev, created]);
      setSelectedSubject(newSubject.name.trim());
      setShowCreateSubject(false);
      setNewSubjectName("");
    } catch (err) {
      console.error("Error creating subject:", err);
      setError("Failed to create subject. Please try again.");
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleCreateConcept = async () => {
    if (!user || !selectedSubjectObj || !selectedTopicObj || !newConceptName.trim()) return;
    setCreatingConcept(true);
    try {
      const firestore = getFirebaseDb();
      // Add concept to topic in Firestore
      const updatedConcept = {
        name: newConceptName.trim(),
        description: newConceptDescription.trim(),
        createdAt: new Date().toISOString(),
      };
      // Update the topic's concepts array
      const updatedTopics = selectedSubjectObj.topics.map(t =>
        t.name === selectedTopic ? {
          ...t,
          concepts: [...(t.concepts || []), updatedConcept]
        } : t
      );
      // Update in Firestore
      const subjectRef = doc(firestore, 'subjects', selectedSubjectObj.id);
      await updateDoc(subjectRef, { topics: updatedTopics });
      // Update local state
      setSubjects(prev => prev.map(s =>
        s.id === selectedSubjectObj.id ? { ...s, topics: updatedTopics } : s
      ));
      setSelectedConcept(newConceptName.trim());
      setShowCreateConcept(false);
      setNewConceptName("");
      setNewConceptDescription("");
    } catch (err) {
      console.error("Error creating concept:", err);
      setError("Failed to create concept. Please try again.");
    } finally {
      setCreatingConcept(false);
    }
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  const getThemeTitle = () => {
    switch (theme.toLowerCase()) {
      case "naruto":
        return "Jutsu Training Log";
      case "dbz":
        return "Power Level Training";
      case "hogwarts":
        return "Magical Studies Journal";
      default:
        return "Study Session Logger";
    }
  };

  // Find the selected subject and topic objects
  const selectedSubjectObj = subjects.find(s => s.name === selectedSubject);
  const selectedTopicObj = selectedSubjectObj?.topics?.find(t => t.name === selectedTopic);
  const concepts = selectedTopicObj?.concepts || [];

  // Find the selected concept object
  const selectedConceptObj = concepts.find(c => c.name === selectedConcept);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{getThemeTitle()}</h1>
        <p className="text-slate-400 mb-6">Track your progress and growth</p>
        
        <form onSubmit={handleSubmitSession} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  if (e.target.value === "_create") {
                    setShowCreateSubject(true);
                    setSelectedSubject("");
                  } else {
                    setShowCreateSubject(false);
                    setSelectedSubject(e.target.value);
                  }
                }}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={`subject-${subject.name}`} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
                <option value="_create">+ Create new subject</option>
              </select>
              {showCreateSubject && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    placeholder="New subject name"
                    className="flex-1 p-2 bg-slate-700 border border-slate-600 rounded text-white"
                    disabled={creatingSubject}
                  />
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-50"
                    onClick={handleCreateSubject}
                    disabled={creatingSubject || !newSubjectName.trim()}
                  >
                    {creatingSubject ? "Creating..." : "Add"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setSelectedConcept(""); // Reset concept when topic changes
                }}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a topic</option>
                {selectedSubject &&
                  subjects
                    .find((s) => s.name === selectedSubject)
                    ?.topics.map((topic) => (
                      <option key={`topic-${topic.name}`} value={topic.name}>
                        {topic.name}
                      </option>
                    ))}
              </select>
              {/* Concept dropdown if topic has concepts */}
              {concepts.length > 0 && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Concept</label>
                  <select
                    value={selectedConcept}
                    onChange={e => {
                      if (e.target.value === "_create_concept") {
                        setShowCreateConcept(true);
                        setSelectedConcept("");
                      } else {
                        setShowCreateConcept(false);
                        setSelectedConcept(e.target.value);
                      }
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a concept</option>
                    {concepts.map((concept) => (
                      <option key={`concept-${concept.name}`} value={concept.name}>{concept.name}</option>
                    ))}
                    <option value="_create_concept">+ Add new concept</option>
                  </select>
                  {showCreateConcept && (
                    <div className="mt-2 flex flex-col gap-2">
                      <input
                        type="text"
                        value={newConceptName}
                        onChange={e => setNewConceptName(e.target.value)}
                        placeholder="New concept name"
                        className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
                        disabled={creatingConcept}
                      />
                      <textarea
                        value={newConceptDescription}
                        onChange={e => setNewConceptDescription(e.target.value)}
                        placeholder="Concept description (optional)"
                        className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
                        rows={2}
                        disabled={creatingConcept}
                      />
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-50"
                        onClick={handleCreateConcept}
                        disabled={creatingConcept || !newConceptName.trim()}
                      >
                        {creatingConcept ? "Creating..." : "Add Concept"}
                      </button>
                    </div>
                  )}
                  {selectedConceptObj && !showCreateConcept && (
                    <div className="mt-2 p-2 bg-slate-700 rounded text-slate-200 text-xs">
                      <div className="font-semibold mb-1">{selectedConceptObj.name}</div>
                      <div>{selectedConceptObj.description || "No description available."}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {theme.toLowerCase() === "naruto" ? "Training Duration (minutes)" : "Duration (minutes)"}
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min="1"
              required
            />
          </div>

          {theme.toLowerCase() === "naruto" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">Jutsu Mastery Assessment</h3>
              {Object.entries(jutsuMastery).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">
                      {key.split(/(?=[A-Z])/).join(" ")}
                    </label>
                    <span className="text-sm text-slate-400">
                      {JUTSU_DESCRIPTIONS[key as keyof typeof jutsuMastery]}
                    </span>
                  </div>
                  <input
                    type="range"
                    value={value}
                    onChange={(e) => setJutsuMastery(prev => ({
                      ...prev,
                      [key]: Number(e.target.value)
                    }))}
                    className="w-full"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <div className="text-right text-sm text-orange-400">{value}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confidence (%)
              </label>
              <input
                type="range"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full"
                min="0"
                max="100"
                step="5"
              />
              <div className="text-right text-sm text-blue-400">{confidence}%</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {theme.toLowerCase() === "naruto" ? "Training Notes" : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={3}
              placeholder={theme.toLowerCase() === "naruto" ? "Record your training observations and insights..." : "Add your study notes..."}
            />
          </div>

          {selectedSubject &&
            subjects.find((s) => s.name === selectedSubject)?.studyStyle === "anki" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cards Reviewed
                  </label>
                  <input
                    type="number"
                    value={cardsReviewed}
                    onChange={(e) => setCardsReviewed(Number(e.target.value))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    New Cards
                  </label>
                  <input
                    type="number"
                    value={newCards}
                    onChange={(e) => setNewCards(Number(e.target.value))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            )}

          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              theme.toLowerCase() === "naruto"
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white transition-colors`}
          >
            {theme.toLowerCase() === "naruto" ? (
              <>
                <Flame className="h-5 w-5" />
                Log Training Session
              </>
            ) : (
              <>
                <Scroll className="h-5 w-5" />
                Log Study Session
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 