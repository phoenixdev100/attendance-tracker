// API endpoint to get user's marked students
// This endpoint should be added to server.js after the /api/today-stats endpoint
// Replace the existing /api/user-stats/:userId endpoint with this corrected version

app.get('/api/user-stats/:userId', async (req, res) => {
    const { userId } = req.params;
    const today = getTodayDate();

    try {
        // Get total number of students marked by this user today
        const totalQuery = `
      SELECT COUNT(*) as total 
      FROM attendance 
      WHERE marked_by = $1 AND date = $2 AND present = true
    `;
        const totalResult = await pool.query(totalQuery, [userId, today]);
        const total = parseInt(totalResult.rows[0].total);

        // Get list of students marked by this user today
        const markedStudentsQuery = `
      SELECT s.system_id, s.name, s.dept, a.recorded_at,
             STRING_AGG(DISTINCT t.team_id, ', ') as team_ids,
             STRING_AGG(DISTINCT t.team_name, ', ') as team_names
      FROM students s
      INNER JOIN attendance a ON s.system_id = a.student_id
      LEFT JOIN student_teams st ON s.system_id = st.student_id
      LEFT JOIN teams t ON st.team_id = t.team_id
      WHERE a.marked_by = $1 AND a.date = $2 AND a.present = true
      GROUP BY s.system_id, s.name, s.dept, a.recorded_at
      ORDER BY a.recorded_at ASC
    `;
        const markedStudentsResult = await pool.query(markedStudentsQuery, [userId, today]);

        res.json({
            date: today,
            total: total,
            markedStudents: markedStudentsResult.rows
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});
