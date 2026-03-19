export interface TheHiveCase {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  _updatedBy?: string;
  _updatedAt?: number;
  title: string;
  description?: string;
  severity?: number;
  startDate?: number;
  endDate?: number;
  tags?: string[];
  flag?: boolean;
  tlp?: number;
  pap?: number;
  status?: string;
  summary?: string;
  owner?: string;
  customFields?: Record<string, unknown>;
  caseTemplate?: string;
  number?: number;
  impactStatus?: string;
  resolutionStatus?: string;
}

export interface TheHiveAlert {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  _updatedBy?: string;
  _updatedAt?: number;
  title: string;
  description?: string;
  severity?: number;
  date?: number;
  tags?: string[];
  tlp?: number;
  pap?: number;
  status?: string;
  type?: string;
  source?: string;
  sourceRef?: string;
  caseId?: string;
  follow?: boolean;
  customFields?: Record<string, unknown>;
  caseTemplate?: string;
}

export interface TheHiveTask {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  _updatedBy?: string;
  _updatedAt?: number;
  title: string;
  description?: string;
  status?: string;
  flag?: boolean;
  startDate?: number;
  endDate?: number;
  order?: number;
  dueDate?: number;
  group?: string;
  assignee?: string;
}

export interface TheHiveObservable {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  _updatedBy?: string;
  _updatedAt?: number;
  dataType: string;
  data?: string;
  message?: string;
  tags?: string[];
  tlp?: number;
  pap?: number;
  ioc?: boolean;
  sighted?: boolean;
  sightedAt?: number;
  reports?: Record<string, unknown>;
  ignoreSimilarity?: boolean;
}

export interface TheHiveTaskLog {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  message: string;
  startDate?: number;
  includeInTimeline?: number;
  owner?: string;
}

export interface TheHiveComment {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  _updatedBy?: string;
  _updatedAt?: number;
  message: string;
}

export interface TheHiveUser {
  _id: string;
  login: string;
  name: string;
  email?: string;
  profile?: string;
  status?: string;
  organisation?: string;
  roles?: string[];
  hasKey?: boolean;
  hasPassword?: boolean;
  hasMFA?: boolean;
}

export interface TheHiveQuery {
  query?: Record<string, unknown>[];
  range?: string;
  sort?: string[];
}

export interface TheHiveAnalyzer {
  id: string;
  name: string;
  version?: string;
  description?: string;
  dataTypeList?: string[];
  cortexIds?: string[];
}

export interface TheHiveJob {
  _id: string;
  _type?: string;
  _createdBy?: string;
  _createdAt?: number;
  analyzerId?: string;
  analyzerName?: string;
  analyzerDefinition?: string;
  status?: string;
  startDate?: number;
  endDate?: number;
  report?: Record<string, unknown>;
  cortexId?: string;
  cortexJobId?: string;
  observableId?: string;
}

export interface TheHiveStatus {
  versions: {
    Scalligraph: string;
    TheHive: string;
    Play: string;
  };
  config: {
    protectDownloadsWith?: string;
    authType?: string[];
    capabilities?: string[];
    ssoAutoLogin?: boolean;
    freeTagDefaultColour?: string;
  };
}
