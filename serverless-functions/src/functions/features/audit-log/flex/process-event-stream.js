exports.handler = async function(context, event, callback) {
  const client = context.getTwilioClient();
  const data = { ...event, timestamp: Date.now() };
  try {
    const map = await client.sync.v1.services(context.TWILIO_FLEX_SYNC_SID).syncMaps.create({ uniqueName: 'AuditLogsEvents' });
    await client.sync.v1.services(context.TWILIO_FLEX_SYNC_SID).syncMaps(map.sid).syncMapItems.create({ data });
    return callback(null, data);
  } catch (e) {
    return callback(e);
  }
};
