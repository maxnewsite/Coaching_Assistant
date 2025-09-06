// lib/database.js
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Save a complete coaching session to the database
 * @param {Object} sessionData - The session data to save
 * @param {Array} sessionData.transcript - Array of transcript entries
 * @param {number} sessionData.startTime - Session start timestamp
 * @param {number} sessionData.endTime - Session end timestamp (optional)
 * @param {Object} sessionData.metadata - Additional session metadata
 * @returns {Promise<Object>} The saved session data with ID
 */
export async function saveCoachingSession(sessionData) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - session data not saved to database')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { transcript, startTime, endTime, metadata = {} } = sessionData
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      throw new Error('Invalid transcript data provided')
    }

    if (!startTime) {
      throw new Error('Session start time is required')
    }

    // Calculate session statistics
    const sessionStartTime = new Date(startTime).toISOString()
    const sessionEndTime = endTime ? new Date(endTime).toISOString() : new Date().toISOString()
    const durationSeconds = Math.floor((new Date(sessionEndTime) - new Date(sessionStartTime)) / 1000)
    
    const speakerCounts = transcript.reduce((acc, entry) => {
      acc[entry.source] = (acc[entry.source] || 0) + 1
      return acc
    }, {})

    // Create the session record
    const sessionRecord = {
      session_start_time: sessionStartTime,
      session_end_time: sessionEndTime,
      duration_seconds: durationSeconds,
      total_entries: transcript.length,
      coach_entries: speakerCounts.coach || 0,
      coachee_entries: speakerCounts.coachee || 0,
      ai_entries: speakerCounts.ai || 0,
      session_metadata: {
        ...metadata,
        browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        saved_at: new Date().toISOString()
      }
    }

    // Insert the session - FIXED: Renamed sessionData to savedSession to avoid variable collision
    const { data: savedSession, error: sessionError } = await supabase
      .from('coaching_sessions')
      .insert([sessionRecord])
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    // Prepare transcript entries - FIXED: Use savedSession instead of sessionData
    const entries = transcript.map((entry, index) => ({
      session_id: savedSession.id,
      timestamp_utc: new Date(entry.timestamp).toISOString(),
      elapsed_seconds: startTime ? Math.floor((entry.timestamp - startTime) / 1000) : 0,
      speaker: entry.source,
      content: entry.text,
      entry_order: index,
      metadata: entry.metadata || {}
    }))

    // Insert transcript entries in batches (Supabase has a limit)
    const batchSize = 1000
    const entryBatches = []
    for (let i = 0; i < entries.length; i += batchSize) {
      entryBatches.push(entries.slice(i, i + batchSize))
    }

    for (const batch of entryBatches) {
      const { error: entriesError } = await supabase
        .from('session_entries')
        .insert(batch)

      if (entriesError) {
        throw new Error(`Failed to insert transcript entries: ${entriesError.message}`)
      }
    }

    console.log(`Successfully saved coaching session ${savedSession.id} with ${transcript.length} entries`)
    
    return {
      success: true,
      sessionId: savedSession.id,
      entriesCount: transcript.length,
      data: savedSession  // FIXED: Return savedSession instead of sessionData
    }

  } catch (error) {
    console.error('Error saving coaching session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Retrieve a coaching session by ID
 * @param {string} sessionId - The session ID to retrieve
 * @returns {Promise<Object>} The session data with transcript entries
 */
export async function getCoachingSession(sessionId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      throw new Error(`Failed to retrieve session: ${sessionError.message}`)
    }

    // Get transcript entries
    const { data: entries, error: entriesError } = await supabase
      .from('session_entries')
      .select('*')
      .eq('session_id', sessionId)
      .order('entry_order')

    if (entriesError) {
      throw new Error(`Failed to retrieve transcript entries: ${entriesError.message}`)
    }

    return {
      success: true,
      data: {
        session,
        entries
      }
    }

  } catch (error) {
    console.error('Error retrieving coaching session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * List coaching sessions with pagination
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of sessions to retrieve (default: 20)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {string} options.orderBy - Column to order by (default: 'created_at')
 * @param {boolean} options.ascending - Sort order (default: false)
 * @returns {Promise<Object>} List of sessions
 */
export async function listCoachingSessions(options = {}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      ascending = false
    } = options

    let query = supabase
      .from('coaching_sessions')
      .select(`
        id,
        session_start_time,
        session_end_time,
        duration_seconds,
        total_entries,
        coach_entries,
        coachee_entries,
        ai_entries,
        created_at,
        session_metadata
      `)
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending })

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`)
    }

    return {
      success: true,
      data,
      count,
      hasMore: count > offset + limit
    }

  } catch (error) {
    console.error('Error listing coaching sessions:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Delete a coaching session and all its entries
 * @param {string} sessionId - The session ID to delete
 * @returns {Promise<Object>} Success status
 */
export async function deleteCoachingSession(sessionId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Delete session (entries will be cascade deleted)
    const { error } = await supabase
      .from('coaching_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }

    return { success: true }

  } catch (error) {
    console.error('Error deleting coaching session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Export session data to CSV format (for backup or analysis)
 * @param {string} sessionId - The session ID to export
 * @returns {Promise<Object>} CSV data
 */
export async function exportSessionToCSV(sessionId) {
  try {
    const result = await getCoachingSession(sessionId)
    
    if (!result.success) {
      return result
    }

    const { session, entries } = result.data
    
    // Create CSV content
    const csvHeaders = ['Timestamp', 'Elapsed Time (seconds)', 'Speaker', 'Text']
    const csvRows = entries.map(entry => {
      const timestamp = new Date(entry.timestamp_utc).toLocaleString()
      const speaker = entry.speaker.charAt(0).toUpperCase() + entry.speaker.slice(1)
      const escapedText = entry.content.replace(/"/g, '""')
      const textCell = escapedText.includes(',') ? `"${escapedText}"` : escapedText
      
      return [
        timestamp,
        entry.elapsed_seconds,
        speaker,
        textCell
      ].join(',')
    })

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')
    
    return {
      success: true,
      data: {
        csvContent,
        filename: `coaching-session-${sessionId}-${new Date().toISOString().split('T')[0]}.csv`,
        session
      }
    }

  } catch (error) {
    console.error('Error exporting session to CSV:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Re-export isSupabaseConfigured
export { isSupabaseConfigured }
