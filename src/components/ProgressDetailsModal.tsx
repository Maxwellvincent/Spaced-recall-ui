// ... existing code ...
                            <select
                              value={editingSession.activityType || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value in activityTypes) {
                                  setEditingSession({
                                    ...editingSession,
                                    activityType: value
                                  });
                                }
                              }}
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            >
                              <option value="">Select Activity Type</option>
                              {Object.keys(activityTypes).map((key) => (
                                <option key={key} value={key}>
                                  {key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())}
                                </option>
                              ))}
                            </select>
// ... existing code ...
                            <select
                              value={editingSession.difficulty || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value in difficultyLevels) {
                                  setEditingSession({
                                    ...editingSession,
                                    difficulty: value
                                  });
                                }
                              }}
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            >
                              <option value="">Select Difficulty</option>
                              {Object.keys(difficultyLevels).map((key) => (
                                <option key={key} value={key}>
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </option>
                              ))}
                            </select>
// ... existing code ...