// Calculate performance score from various metrics
export const calculatePerformanceScore = (
  attendance,
  journalEntries,
  tasksCompleted,
  dailyCheckins
) => {
  // Normalize each metric to 0-10 scale
  const attendanceScore = (attendance / 100) * 10;
  const journalScore = Math.min(journalEntries * 1.5, 10);
  const taskScore = Math.min(tasksCompleted * 2, 10);
  const checkinScore = Math.min(dailyCheckins * 1.5, 10);

  // Weighted average
  const score = (attendanceScore * 0.3 + journalScore * 0.25 + taskScore * 0.25 + checkinScore * 0.2);
  return Math.max(1, Math.min(10, score));
};

// Calculate wellbeing score from journal data
export const calculateWellbeingScore = (journalData) => {
  const { mood = 5, energy = 5, anxiety = 5 } = journalData;

  // Mood and energy contribute positively, anxiety contributes negatively
  const moodScore = mood * 2; // 0-20 scale
  const energyScore = energy * 1.5; // 0-15 scale
  const anxietyScore = (10 - anxiety) * 1.5; // Inverted, 0-15 scale

  // Combined score normalized to 1-10
  const totalScore = (moodScore + energyScore + anxietyScore) / 5;
  return Math.max(1, Math.min(10, totalScore));
};

// Generate therapeutic progression data for individual members
export const generateTherapeuticProgressData = (
  memberId,
  memberName,
  status = "Active"
) => {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];
  const initials = memberName.split(' ').map(n => n[0]).join('');

  const weeklyData = weeks.map((weekName, index) => {
    const weekNumber = index + 1;

    // Define therapeutic progression patterns
    const getTherapeuticScores = (week) => {
      // Performance progression: starts moderate, improves steadily but plateaus
      let basePerformance;
      if (week <= 2) {
        basePerformance = 4 + Math.random() * 2; // 4-6 range
      } else if (week <= 5) {
        basePerformance = 5 + Math.random() * 2; // 5-7 range
      } else {
        basePerformance = 6 + Math.random() * 1; // 6-7 range
      }

      // Wellbeing progression: starts low, gradually improves to surpass performance
      let baseWellbeing;
      if (week <= 2) {
        baseWellbeing = 2.5 + Math.random() * 1.5; // 2.5-4 range (low start)
      } else if (week <= 5) {
        // Gradual improvement with logarithmic growth
        const progressFactor = (week - 2) / 3; // 0 to 1 over weeks 3-5
        baseWellbeing = 4 + progressFactor * 2 + Math.random() * 1; // 4-7 range
      } else {
        // Wellbeing surpasses performance in final weeks
        const progressFactor = (week - 5) / 3; // 0 to 1 over weeks 6-8
        baseWellbeing = 7 + progressFactor * 2 + Math.random() * 0.5; // 7-9.5 range
      }

      // Add individual member consistency (some improve faster than others)
      const memberFactor = initials.charCodeAt(0) / 100; // Consistent per member
      const performanceScore = Math.max(1, Math.min(10, basePerformance + (memberFactor * 0.5)));
      const wellbeingScore = Math.max(1, Math.min(10, baseWellbeing + (memberFactor * 0.3)));

      return { performanceScore, wellbeingScore };
    };

    const { performanceScore, wellbeingScore } = getTherapeuticScores(weekNumber);

    // Reduce scores for inactive members
    const performanceMultiplier = status === "Active" ? 1 : 0.6;
    const wellbeingMultiplier = status === "Active" ? 1 : 0.5;

    return {
      week: weekName,
      performance: Math.round(performanceScore * performanceMultiplier * 10) / 10,
      wellbeing: Math.round(wellbeingScore * wellbeingMultiplier * 10) / 10,
    };
  });

  // Get current metrics (latest week)
  const currentMetrics = weeklyData[weeklyData.length - 1];

  return {
    id: memberId,
    name: memberName,
    initials,
    status,
    currentMetrics: {
      performance: currentMetrics.performance,
      wellbeing: currentMetrics.wellbeing,
    },
    weeklyData,
  };
};

// Generate group progress data from member data
export const getGroupProgressData = (
  groupId,
  groupName,
  members
) => {
  const memberProgressData = members.map(member =>
    generateTherapeuticProgressData(member.id, member.name, member.status)
  );

  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];

  const weeklyAverages = weeks.map((weekName, index) => {
    const activeMembers = memberProgressData.filter(m => m.status === "Active");
    const weekData = activeMembers.map(member => member.weeklyData[index]);

    const avgPerformance = weekData.reduce((sum, data) => sum + data.performance, 0) / weekData.length;
    const avgWellbeing = weekData.reduce((sum, data) => sum + data.wellbeing, 0) / weekData.length;

    return {
      week: weekName,
      performance: Math.round(avgPerformance * 10) / 10,
      wellbeing: Math.round(avgWellbeing * 10) / 10,
      memberCount: activeMembers.length,
    };
  });

  return {
    groupId,
    groupName,
    weeklyAverages,
    members: memberProgressData,
  };
};