"use client"

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function QuestionnaireSteps({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    programName: "",
    programDescription: "",
    duration: 4,
    targetAudience: "",
    
    // Step 2: Content Preferences
    tonePreference: "supportive",
    contentDepth: "moderate",
    language: "en",
    
    // Step 3: Structure Preferences
    messageFrequency: "every-2-3-days",
    taskTypes: [],
    documentStructure: "moderate",
    
    // Step 4: Customization
    specificTopics: "",
    specialInstructions: ""
  });

  const totalSteps = 4;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTaskType = (type) => {
    setFormData(prev => ({
      ...prev,
      taskTypes: prev.taskTypes.includes(type)
        ? prev.taskTypes.filter(t => t !== type)
        : [...prev.taskTypes, type]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.programName.trim() && formData.duration > 0;
      case 2:
        return true; // All optional
      case 3:
        return true; // All optional
      case 4:
        return true; // All optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (!validateStep(currentStep)) {
      toast.error("Please fill in all required fields");
      return;
    }
    onComplete(formData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <Step2ContentPreferences formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3StructurePreferences formData={formData} updateFormData={updateFormData} toggleTaskType={toggleTaskType} />;
      case 4:
        return <Step4Customization formData={formData} updateFormData={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
          <span className="text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4 pb-4 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!validateStep(currentStep)}
          className="w-full sm:w-auto"
        >
          {currentStep === totalSteps ? (
            <>
              Generate Program
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 1: Basic Information
function Step1BasicInfo({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Tell us about your program
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="programName">Program Name *</Label>
          <Input
            id="programName"
            value={formData.programName}
            onChange={(e) => updateFormData("programName", e.target.value)}
            placeholder="e.g., Anxiety Management Program"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="programDescription">Program Description</Label>
          <Textarea
            id="programDescription"
            value={formData.programDescription}
            onChange={(e) => updateFormData("programDescription", e.target.value)}
            placeholder="Describe what this program helps with, the goals, target audience..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Weeks) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="52"
              value={formData.duration}
              onChange={(e) => updateFormData("duration", parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => updateFormData("targetAudience", e.target.value)}
              placeholder="e.g., Individual clients, Groups"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Content Preferences
function Step2ContentPreferences({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Content Preferences</h3>
        <p className="text-sm text-muted-foreground">
          How should the content be written?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tonePreference">Tone Preference</Label>
          <Select
            value={formData.tonePreference}
            onValueChange={(value) => updateFormData("tonePreference", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supportive">Supportive and Warm</SelectItem>
              <SelectItem value="professional">Professional and Clinical</SelectItem>
              <SelectItem value="motivational">Motivational and Energetic</SelectItem>
              <SelectItem value="educational">Educational and Informative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentDepth">Content Depth</Label>
          <Select
            value={formData.contentDepth}
            onValueChange={(value) => updateFormData("contentDepth", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brief">Brief Overviews</SelectItem>
              <SelectItem value="moderate">Moderate Detail</SelectItem>
              <SelectItem value="comprehensive">Comprehensive Guides</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => updateFormData("language", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="da">Danish</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Step 3: Structure Preferences
function Step3StructurePreferences({ formData, updateFormData, toggleTaskType }) {
  const taskTypeOptions = [
    { id: "reflection", label: "Reflection Exercises" },
    { id: "action", label: "Action Items" },
    { id: "journaling", label: "Journaling Prompts" },
    { id: "assessment", label: "Assessment Questions" },
    { id: "homework", label: "Homework Assignments" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Structure Preferences</h3>
        <p className="text-sm text-muted-foreground">
          How should the program be structured?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="messageFrequency">Message Frequency</Label>
          <Select
            value={formData.messageFrequency}
            onValueChange={(value) => updateFormData("messageFrequency", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="every-2-3-days">Every 2-3 Days</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Task Types</Label>
          <div className="space-y-2 border rounded-md p-4">
            {taskTypeOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={formData.taskTypes.includes(option.id)}
                  onCheckedChange={() => toggleTaskType(option.id)}
                />
                <Label
                  htmlFor={option.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentStructure">Document Structure</Label>
          <Select
            value={formData.documentStructure}
            onValueChange={(value) => updateFormData("documentStructure", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple (Overview Only)</SelectItem>
              <SelectItem value="moderate">Moderate (Sections + Exercises)</SelectItem>
              <SelectItem value="comprehensive">Comprehensive (Detailed Guides)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Step 4: Customization
function Step4Customization({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Additional Customization</h3>
        <p className="text-sm text-muted-foreground">
          Add any specific requirements (optional)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="specificTopics">Specific Topics/Techniques to Include</Label>
          <Textarea
            id="specificTopics"
            value={formData.specificTopics}
            onChange={(e) => updateFormData("specificTopics", e.target.value)}
            placeholder="e.g., Include mindfulness exercises, Use CBT framework, Focus on breathing techniques"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialInstructions">Special Instructions</Label>
          <Textarea
            id="specialInstructions"
            value={formData.specialInstructions}
            onChange={(e) => updateFormData("specialInstructions", e.target.value)}
            placeholder="e.g., Keep language simple, Include video references, Add progress tracking"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}

