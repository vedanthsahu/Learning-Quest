## Appendix D: Consolidated Cloud-Agnostic Concept Index

*Every per-chapter Cloud-Agnostic Mapping table, consolidated in one place. Use this to translate the entire book's AWS-primary content to Azure or GCP quickly, without hunting through individual chapters.*

| Concept | AWS | Azure | GCP | Chapter |
|---|---|---|---|---|
| Virtual Machine | EC2 | Azure Virtual Machines | Compute Engine | §1 |
| Serverless Function | Lambda | Azure Functions | Cloud Functions / Cloud Run Functions | §2 |
| Managed Container Orchestration | ECS | Azure Container Apps / ACI | Cloud Run | §3 |
| Managed Kubernetes | EKS | AKS | GKE | §3 |
| Container Registry | ECR | Azure Container Registry | Artifact Registry | §3 |
| Object Storage | S3 | Blob Storage | Cloud Storage | §4 |
| Block Storage | EBS | Azure Managed Disks | Persistent Disk | §5 |
| Virtual Network | VPC | Virtual Network (VNet) | VPC | §6 |
| Managed DNS | Route 53 | Azure DNS | Cloud DNS | §7 |
| CDN | CloudFront | Azure CDN / Front Door | Cloud CDN | §8 |
| API Gateway | API Gateway | Azure API Management | Apigee / API Gateway | §9 |
| Layer-7 Load Balancer | Application Load Balancer | Azure Application Gateway | Cloud Load Balancing (HTTP(S)) | §10 |
| Managed Relational Database | RDS | Azure SQL Database / Azure Database for PostgreSQL/MySQL | Cloud SQL | §11 |
| Cloud-Native Relational Database | Aurora | Azure SQL Database (Hyperscale) | AlloyDB | §12 |
| Managed NoSQL Key-Value/Document Store | DynamoDB | Cosmos DB | Firestore / Bigtable | §13 |
| Message Queue | SQS | Azure Queue Storage / Service Bus | Pub/Sub | §14 |
| Pub/Sub Topic | SNS | Azure Service Bus Topics | Pub/Sub | §14 |
| Event Bus / Content-Based Routing | EventBridge | Azure Event Grid | Eventarc | §15 |
| Identity & Access Management | IAM | Azure Active Directory (Entra ID) + RBAC | Cloud IAM | §16 |
| Secrets Management | Secrets Manager | Azure Key Vault | Secret Manager | §17 |
| Key Management | KMS | Azure Key Vault (Keys) | Cloud KMS | §17 |
| Metrics/Logs/Alarms | CloudWatch | Azure Monitor | Cloud Monitoring / Cloud Logging | §18 |
| Distributed Tracing | X-Ray | Application Insights | Cloud Trace | §18 |
| Native IaC | CloudFormation | Azure Resource Manager (ARM) / Bicep | Deployment Manager | §19 |
| Multi-Cloud IaC | Terraform | Terraform | Terraform | §19 |
| Workflow Orchestration | Step Functions | Azure Logic Apps / Durable Functions | Workflows | §20 |
| Managed In-Memory Cache | ElastiCache | Azure Cache for Redis | Memorystore | §21 |
| Configuration Store | Parameter Store | Azure App Configuration | Cloud Runtime Configurator | §22 |
| Shell-Free Instance Access | Systems Manager Session Manager | Azure Bastion | Identity-Aware Proxy (IAP) | §22 |
| Compute Auto Scaling | Auto Scaling Groups | Virtual Machine Scale Sets | Managed Instance Groups | §23 |
| Managed Customer Identity | Cognito | Azure AD B2C | Identity Platform | §24 |
| Managed Search/Log Analytics | OpenSearch Service | Azure Cognitive Search | (Elastic Cloud on GCP Marketplace) | §25 |
| Managed Batch Computing | AWS Batch | Azure Batch | Batch on GCP (Cloud Batch) | §26 |
| Web Application Firewall | WAF | Azure WAF | Cloud Armor | §27 |
| DDoS Protection | Shield | Azure DDoS Protection | Cloud Armor (DDoS features) | §27 |
| Managed Shared File Storage | EFS | Azure Files | Filestore | §28 |
| Audit Logging | CloudTrail | Azure Activity Log | Cloud Audit Logs | §29 |
| Cost Management | Cost Explorer / Budgets | Azure Cost Management | Cloud Billing Reports / Budgets | §29 |
| Multi-Account Management | AWS Organizations | Azure Management Groups | Resource Manager (Folders/Orgs) | §29 |
| ETL / Data Catalog | Glue | Azure Data Factory / Synapse | Dataflow / Dataproc | §30 |
| Serverless SQL over Object Storage | Athena | Synapse Serverless SQL | BigQuery | §31 |
| Big-Data Framework Clusters | EMR | HDInsight | Dataproc | §32 |
| Data Warehouse | Redshift | Synapse Analytics | BigQuery | §33 |
| Real-Time Data Streaming | Kinesis | Event Hubs | Pub/Sub + Dataflow | §34 |
| Managed GraphQL | AppSync | API Management (GraphQL) | Apigee / Cloud Endpoints | §35 |
| IoT Device Connectivity | IoT Core | Azure IoT Hub | Cloud IoT Core (status varies) | §36 |
| Document/Vision/Speech/Conversational AI | Textract / Rekognition / Polly / Lex | Azure AI Document Intelligence / Vision / Speech / Bot Service | Document AI / Vision AI / Text-to-Speech / Dialogflow | §37 |
| Managed ML Platform | SageMaker | Azure Machine Learning | Vertex AI | §38 |

---
