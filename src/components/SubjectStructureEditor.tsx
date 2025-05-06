import { useState } from 'react';
import { SubjectStructure, Topic } from '@/types/subject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GripVertical, Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SubjectStructureEditorProps {
  initialStructure: SubjectStructure;
  onSave: (structure: SubjectStructure) => Promise<void>;
  isLoading?: boolean;
  onStartOver?: () => void;
}

export function SubjectStructureEditor({
  initialStructure,
  onSave,
  isLoading = false,
  onStartOver,
}: SubjectStructureEditorProps) {
  const [structure, setStructure] = useState<SubjectStructure>(initialStructure);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateStructure = (): boolean => {
    const errors: string[] = [];

    if (!structure.name?.trim()) {
      errors.push("Subject name is required");
    }
    if (!structure.description?.trim()) {
      errors.push("Subject description is required");
    }
    if (!Array.isArray(structure.topics) || structure.topics.length === 0) {
      errors.push("At least one topic is required");
    }

    structure.topics.forEach((topic, index) => {
      if (!topic.name?.trim()) {
        errors.push(`Topic ${index + 1}: Name is required`);
      }
      if (!topic.description?.trim()) {
        errors.push(`Topic ${index + 1}: Description is required`);
      }
      if (!Array.isArray(topic.coreConcepts) || topic.coreConcepts.length === 0) {
        errors.push(`Topic ${index + 1}: At least one core concept is required`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleTopicChange = (index: number, field: keyof Topic, value: any) => {
    const newTopics = [...structure.topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    setStructure({ ...structure, topics: newTopics });
    validateStructure();
  };

  const handleAddTopic = () => {
    const newTopic: Topic = {
      name: '',
      description: '',
      coreConcepts: [],
      estimatedStudyHours: 1,
    };
    setStructure({
      ...structure,
      topics: [...structure.topics, newTopic],
    });
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = structure.topics.filter((_, i) => i !== index);
    setStructure({ ...structure, topics: newTopics });
    validateStructure();
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(structure.topics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStructure({ ...structure, topics: items });
  };

  const handleSubmit = async () => {
    if (!validateStructure()) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    try {
      await onSave(structure);
    } catch (error) {
      toast.error("Failed to save subject structure");
    }
  };

  if (isPreviewMode) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{structure.name || "Untitled Subject"}</h2>
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-2"
          >
            <EyeOff className="h-4 w-4" />
            Exit Preview
          </Button>
        </div>

        <p className="text-muted-foreground">{structure.description}</p>

        <div className="space-y-6">
          {structure.topics.map((topic, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{topic.name}</CardTitle>
                  {topic.isHabitBased && (
                    <Badge variant="secondary">Habit-based</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{topic.description}</p>
                <div className="space-y-2">
                  <h4 className="font-medium">Core Concepts:</h4>
                  <ul className="list-disc list-inside">
                    {topic.coreConcepts.map((concept, i) => (
                      <li key={i}>{concept}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Estimated study time: {topic.estimatedStudyHours} hours
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-destructive">{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setIsPreviewMode(true)}
          disabled={isLoading}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={structure.name}
                onChange={(e) => {
                  setStructure({ ...structure, name: e.target.value });
                  validateStructure();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={structure.description}
                onChange={(e) => {
                  setStructure({ ...structure, description: e.target.value });
                  validateStructure();
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="topics">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {structure.topics.map((topic, index) => (
                    <Draggable
                      key={index}
                      draggableId={`topic-${index}`}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="text-gray-400" />
                            </div>
                            <Input
                              placeholder="Topic name"
                              value={topic.name}
                              onChange={(e) =>
                                handleTopicChange(index, 'name', e.target.value)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTopic(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Description"
                              value={topic.description}
                              onChange={(e) =>
                                handleTopicChange(
                                  index,
                                  'description',
                                  e.target.value
                                )
                              }
                            />
                            <div>
                              <label className="text-sm font-medium">
                                Core Concepts (comma-separated)
                              </label>
                              <Input
                                value={topic.coreConcepts.join(', ')}
                                onChange={(e) =>
                                  handleTopicChange(
                                    index,
                                    'coreConcepts',
                                    e.target.value.split(',').map((s) => s.trim())
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                Estimated Study Hours
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={topic.estimatedStudyHours}
                                onChange={(e) =>
                                  handleTopicChange(
                                    index,
                                    'estimatedStudyHours',
                                    parseInt(e.target.value) || 1
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`habit-${index}`}
                                checked={topic.isHabitBased}
                                onCheckedChange={(checked) =>
                                  handleTopicChange(
                                    index,
                                    'isHabitBased',
                                    checked
                                  )
                                }
                              />
                              <label
                                htmlFor={`habit-${index}`}
                                className="text-sm font-medium"
                              >
                                Habit-based topic
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={handleAddTopic}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={isLoading}
            >
              Start Over
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will discard all your current progress. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onStartOver?.()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Start Over
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          onClick={handleSubmit}
          disabled={isLoading || validationErrors.length > 0}
        >
          {isLoading ? 'Saving...' : 'Save Subject Structure'}
        </Button>
      </div>
    </div>
  );
} 