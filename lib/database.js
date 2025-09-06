// lib/database.js
import { supabase, isSupabaseConfigured, testSupabaseConnection } from './supabase'

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
  console.log('Starting saveCoachingSession with data:', {
    transcriptLength: sessionData?.transcript?.length,
    startTime: sessionData?.startTime,
    endTime: sessionData?.endTime,
    hasMetadata: !!sessionData?.metadata
  })

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - session data not saved to database')
    return { success: false, error: 'Supabase not configured' }
  }

  // Test connection first
  const connectionTest = await testSupabaseConnection()
  if (!connectionTest.success) {
    console.error('Supabase connection test failed:', connectionTest.error)
    return { success: false, error: `Database connection failed: ${connectionTest.error}` }
  }

  try {
    const { transcript, startTime, endTime, metadata = {} } = sessionData
    
    // Validate required data
    if (!transcript || !Array.isArray(transcript)) {
      throw new Error('Invalid transcript data: must be an array')
    }
    
    if (transcript.length === 0) {
      throw new Error('Invalid transcript data: array is empty')
    }

    if (!startTime || typeof startTime !== 'number') {
      throw new Error('Session start time is required and must be a number')
    }

    // Validate transcript entries structure
    for (let i = 0; i < transcript.length; i++) {
      const entry = transcript[i]
      if (!entry.text || typeof entry.text !== 'string') {
        throw new Error(`Invalid transcript entry at index ${i}: missing or invalid text`)
      }
      if (!entry.source || typeof entry.source !== 'string') {
        throw new Error(`Invalid transcript entry at index ${i}: missing or invalid source`)
      }
      if (!entry.timestamp || typeof entry.timestamp !== 'number') {
        throw new Error(`Invalid transcript entry at index ${i}: missing or invalid timestamp`)
      }
    }

    console.log('Data validation passed')

    // Calculate session statistics
    const sessionStartTime = new Date(startTime).toISOString()
    const sessionEndTime = endTime ? new Date(endTime).toISOString() : new Date().toISOString()
    const durationSeconds = Math.floor((new Date(sessionEndTime) - new Date(sessionStartTime)) / 1000)
    
    const speakerCounts = transcript.reduce((acc, entry) => {
      const speaker = entry.source.toLowerCase() // Normalize speaker names
      acc[speaker] = (acc[speaker] || 0) + 1
      return acc
    }, {})

    console.log('Speaker counts calculated:', speakerCounts)

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
        saved_at: new Date().toISOString(),
        speaker_counts: speakerCounts // Store all speaker counts for debugging
      }
    }

    console.log('Session record prepared:', {
      ...sessionRecord,
      session_metadata: { 
        ...sessionRecord.session_metadata, 
        // Truncate for logging
        keys: Object.keys(sessionRecord.session_metadata)
      }
    })

    // Insert the session
    const { data: savedSession, error: sessionError } = await supabase
      .from('coaching_sessions')
      .insert([sessionRecord])
      .select()
      .single()

    if (sessionError) {
      console.error('Session insert error:', sessionError)
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    console.log('Session saved successfully:', savedSession.id)

    // Prepare transcript entries
    const entries = transcript.map((entry, index) => {
      const entryRecord = {
        session_id: savedSession.id,
        timestamp_utc: new Date(entry.timestamp).toISOString(),
        elapsed_seconds: Math.floor((entry.timestamp - startTime) / 1000),
        speaker: entry.source.toLowerCase(), // Normalize speaker names
        content: entry.text.trim(), // Trim whitespace
        entry_order: index,
        metadata: entry.metadata || {}
      }
      
      // Validate the entry before returning
      if (!entryRecord.content) {
        console.warn(`Empty content for entry ${index}, skipping`)
        return null
      }
      
      return entryRecord
    }).filter(entry => entry !== null) // Remove null entries

    console.log(`Prepared ${entries.length} transcript entries for insertion`)

    if (entries.length === 0) {
      throw new Error('No valid transcript entries to insert')
    }

    // Insert transcript entries in batches (Supabase has a limit)
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}, entries ${i + 1}-${Math.min(i + batchSize, entries.length)}`)
      
      const { error: entriesError } = await supabase
        .from('session_entries')
        .insert(batch)

      if (entriesError) {
        console.error('Entries insert error:', entriesError)
        // If entries fail to insert, we should clean up the session
        await supabase
          .from('coaching_sessions')
          .delete()
          .eq('id', savedSession.id)
        
        throw new Error(`Failed to insert transcript entries: ${entriesError.message}`)
      }
      
      insertedCount += batch.length
    }

    console.log(`Successfully saved coaching session ${savedSession.id} with ${insertedCount} entries`)
    
    return {
      success: true,
      sessionId: savedSession.id,
      entriesCount: insertedCount,
      data: savedSession
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

  // Test connection first
  const connectionTest = await testSupabaseConnection()
  if (!connectionTest.success) {
    return { success: false, error: `Database connection failed: ${connectionTest.error}` }
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
      `, { count: 'exact' })
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

// Re-export configuration check
export { isSupabaseConfigured, testSupabaseConnection }
