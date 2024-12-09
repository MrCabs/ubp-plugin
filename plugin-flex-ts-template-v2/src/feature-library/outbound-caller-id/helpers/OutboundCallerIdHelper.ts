import { Manager } from '@twilio/flex-ui';

import { getConfig } from '../config';
import { BusinessUnitCallerIds, NumberTypeConfig } from '../types/ServiceConfiguration';

export interface PhoneNumberInfo {
  type: string;
  callerId: string | null;
}

export class OutboundCallerIdHelper {
  public static getCallerId(destination: string, businessUnitCallerIds: BusinessUnitCallerIds): PhoneNumberInfo {
    const businessUnit = this.getBusinessUnit();
    if (!businessUnit || !businessUnitCallerIds[businessUnit]) {
      return { type: 'default', callerId: null };
    }

    const firstSixDigits = destination.startsWith('+') ? destination.slice(0, 6) : `+${destination.slice(0, 5)}`;
    const callerIdGroup = businessUnitCallerIds[businessUnit];

    // Get number types from configuration
    const config = getConfig();
    const numberTypes = config?.number_types || [];

    // Sort number types by priority if specified
    const sortedTypes = [...numberTypes].sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });

    // Find matching number type
    const matchedType = this.findMatchingNumberType(destination, firstSixDigits, sortedTypes);

    if (matchedType) {
      const callerIds = callerIdGroup[matchedType.callerIdGroup];
      const callerId = this.getRandomCallerId(callerIds);
      return { type: matchedType.name, callerId };
    }

    // Default to international if no match found
    const defaultCallerIds = callerIdGroup.internationalCallerIds || [];
    return {
      type: 'international',
      callerId: this.getRandomCallerId(defaultCallerIds),
    };
  }

  private static getBusinessUnit(): string | null {
    return Manager.getInstance().workerClient?.attributes?.business_unit || null;
  }

  private static getRandomCallerId(callerIds: string[]): string | null {
    if (!callerIds || !callerIds.length) {
      console.error('Caller ID array is empty or does not exist.');
      return null;
    }
    return callerIds[Math.floor(Math.random() * callerIds.length)];
  }

  private static findMatchingNumberType(
    fullNumber: string,
    firstSixDigits: string,
    numberTypes: NumberTypeConfig[],
  ): NumberTypeConfig | null {
    // Check each number type in priority order
    for (const numberType of numberTypes) {
      if (numberType.prefix && fullNumber.startsWith(numberType.prefix)) {
        return numberType;
      }

      // Check carrier prefixes if defined
      const config = getConfig();
      const carrierPrefixes = config?.carrier_prefixes?.[numberType.name] || [];
      if (carrierPrefixes.includes(firstSixDigits)) {
        return numberType;
      }
    }

    return null;
  }
}
