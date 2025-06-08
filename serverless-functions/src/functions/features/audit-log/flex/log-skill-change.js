const { prepareFlexFunction } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);

const requiredParameters = [
  { key: 'workerSid', purpose: 'worker sid being updated' },
  { key: 'adminSid', purpose: 'sid of administrator performing change' },
  { key: 'changeType', purpose: 'type of change' },
  { key: 'previousValue', purpose: 'previous skills json' },
  { key: 'newValue', purpose: 'new skills json' },
];

exports.handler = prepareFlexFunction(requiredParameters, async (context, event, callback, response, handleError) => {
  const client = context.getTwilioClient();
  try {
    const map = await client.sync.v1.services(context.TWILIO_FLEX_SYNC_SID).syncMaps.create({ uniqueName: 'AuditLogs' });
    await client.sync.v1.services(context.TWILIO_FLEX_SYNC_SID)
      .syncMaps(map.sid)
      .syncMapItems.create({ data: { ...event, timestamp: Date.now() } });
    response.setBody({ success: true });
    return callback(null, response);
  } catch (error) {
    return handleError(error);
  }
});
