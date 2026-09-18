import { ActivatedRoute, convertToParamMap } from '@angular/router';

/** Minimal ActivatedRoute stub for `-detail` components that only read `snapshot.paramMap`. */
export function activatedRouteStub(params: Record<string, string> = {}): Pick<ActivatedRoute, 'snapshot'> {
  return {
    snapshot: { paramMap: convertToParamMap(params) } as ActivatedRoute['snapshot'],
  };
}
