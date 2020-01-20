using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Table;
using System.Configuration;
using Microsoft.WindowsAzure.Storage.Blob;
using Microsoft.WindowsAzure.Storage.Shared.Protocol;

namespace Happy2
{
	public static class TableEntityHelper
	{
		public static string GetString(this DynamicTableEntity entity, string key, string default_value)
		{
			EntityProperty ep;

			if (entity.Properties.TryGetValue(key, out ep))
			{
				// ep.StringValue may be null when using "TableQuery().Select(new string[] { "flags" })" and the property does not exist.
				return ep.StringValue ?? default_value;
			}
			else
				return default_value;
		}
		public static string GetIntOrString(this DynamicTableEntity entity, string key)
		{
			EntityProperty ep;

			if (entity.Properties.TryGetValue(key, out ep))
			{
				if (ep.PropertyType == EdmType.String)
					return ep.StringValue;

				return ep.Int32Value.ToString();
			}
			else
				return null;
		}
		public static int GetInt(this DynamicTableEntity entity, string key, int default_value)
		{
			EntityProperty ep;

			if (entity.Properties.TryGetValue(key, out ep))
			{
				return ep.Int32Value ?? default_value;
			}
			else
				return default_value;
		}
		public static DateTimeOffset? GetDateTimeOffset(this DynamicTableEntity entity, string key, DateTimeOffset? default_value)
		{
			EntityProperty ep;

			if (entity.Properties.TryGetValue(key, out ep))
				return ep.DateTimeOffsetValue;
			else
				return default_value;
		}
	}
	public static class CloudTableHelper
	{
		public static int GetIntProperty(this CloudTable table, string partition_key, string row_key, string property_name, int default_value)
		{
			TableResult result = table.Execute(TableOperation.Retrieve(partition_key, row_key));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			return entity.GetInt(property_name, default_value);		// let it throw null reference exception if the entity does not exist.
		}
		public static void SetIntProperty(this CloudTable table, string partition_key, string row_key, string property_name, int value)
		{
			DynamicTableEntity entity = new DynamicTableEntity(partition_key, row_key);

			entity[property_name] = new EntityProperty(value);
			entity.ETag = "*";

			table.Execute(TableOperation.Merge(entity));
		}
		public static void EnumerateRowRange(this CloudTable table, string par_key, string row_key_prefix, int start, int count, Action<DynamicTableEntity> act)
		{
			int end = start + count - 1;

			if (count <= 0 || end < 0) return;

			string pkFilter = TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, par_key);

			if (start < 0) start = 0;

			int st = start, ed = 10;

			while ((st /= 10) != 0) ed *= 10;

			st = start;
			ed--;

			for (; ; )
			{
				if (ed > end) ed = end;

				string beginning = row_key_prefix + st.ToString();
				int key_len = beginning.Length;

				string rkLowerFilter = TableQuery.GenerateFilterCondition("RowKey", QueryComparisons.GreaterThanOrEqual, beginning);
				string rkUpperFilter = TableQuery.GenerateFilterCondition("RowKey", QueryComparisons.LessThanOrEqual, row_key_prefix + ed.ToString());
				string combinedRowKeyFilter = TableQuery.CombineFilters(rkLowerFilter, TableOperators.And, rkUpperFilter);
				string combinedFilter = TableQuery.CombineFilters(pkFilter, TableOperators.And, combinedRowKeyFilter);

				TableQuery query = new TableQuery().Where(combinedFilter);

				foreach (DynamicTableEntity entity in table.ExecuteQuery(query))
					if (entity.RowKey.Length == key_len)		// 10-19, 100-199, 1000-1999, etc.. are all between 1 and 2. may become very inefficient as total number of entities grow. don't query too old entities by this method.
						act(entity);

				if (ed == end) break;
				st = ed + 1;
				ed = st * 10 - 1;
			}
		}
	}
	public static class Warehouse
	{
		public static CloudTable DrawingsTable { get; private set; }
		public static CloudTable RoomsTable { get; private set; }
		public static CloudTable FiguresTable { get; private set; }
		public static CloudTable ChatsTable { get; private set; }
		public static CloudTable NotesTable { get; private set; }

		public static CloudBlobContainer PictureContainer { get; private set; }
		public static CloudBlobContainer PathBatchContainer { get; private set; }
		public static BlockPathsPond BlockPathsPond { get; private set; }

		public static Random Random { get; private set; }

		public static TableRowPond FiguresRowPond { get; private set; }
		public static TablePartitionPond<FigureInfo> FiguresPartitionPond { get; private set; }

		public static void Initialize()
		{
			InitializeCors();

			DrawingsTable = getTable("Drawings1");
			if (DrawingsTable != null)
				DrawingsTable.CreateIfNotExists();

			RoomsTable = getTable("Rooms1");
			if (RoomsTable != null)
				RoomsTable.CreateIfNotExists();

			FiguresTable = getTable("dwFigures1");
			if (FiguresTable != null)
				FiguresTable.CreateIfNotExists();

			ChatsTable = getTable("Chats1");
			if (ChatsTable != null)
				ChatsTable.CreateIfNotExists();

			NotesTable = getTable("Notes1");
			if (NotesTable != null)
				NotesTable.CreateIfNotExists();

			PictureContainer = getContainer("picture1");
			PathBatchContainer = getContainer("pathbatch1");		// blob name must be lower case.

			BlockPathsPond = new BlockPathsPond();

			Random = new Random();

			FiguresRowPond = new TableRowPond(FiguresTable);
			FiguresPartitionPond = new TablePartitionPond<FigureInfo>(FiguresTable);
		}
		private static CloudBlobContainer getContainer(string container_name)
		{
			string conn_str = ConfigurationManager.AppSettings["StorageConnectionString"];
			CloudStorageAccount storageAccount = CloudStorageAccount.Parse(conn_str);

			CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();

			CloudBlobContainer container = blobClient.GetContainerReference(container_name);

			container.CreateIfNotExists();

			container.SetPermissions(new BlobContainerPermissions { PublicAccess = BlobContainerPublicAccessType.Blob });
			return container;
		}
		private static void InitializeCors()
		{
			string conn_str = ConfigurationManager.AppSettings["StorageConnectionString"];
			CloudStorageAccount storageAccount = CloudStorageAccount.Parse(conn_str);

			CloudBlobClient BlobClient = storageAccount.CreateCloudBlobClient();

			// CORS should be enabled once at service startup
			// Given a BlobClient, download the current Service Properties 
			ServiceProperties blobServiceProperties = BlobClient.GetServiceProperties();

			// Enable and Configure CORS
			ConfigureCors(blobServiceProperties);

			// Commit the CORS changes into the Service Properties
			BlobClient.SetServiceProperties(blobServiceProperties);
		}
		private static void ConfigureCors(ServiceProperties serviceProperties)
		{
			serviceProperties.Cors = new CorsProperties();
			serviceProperties.Cors.CorsRules.Add(new CorsRule()
			{
				AllowedHeaders = new List<string>() { "*" },
				AllowedMethods = CorsHttpMethods.Get,
				AllowedOrigins = new List<string>() { "http://localhost:61265", "http://happy.hela.cc", "http://happy1.azurewebsites.net" },
				ExposedHeaders = new List<string>() { "*" },
				MaxAgeInSeconds = 1800 // 30 minutes
			});
		}
		private static CloudTable getTable(string table_name)
		{
			try
			{
				string conn_str = ConfigurationManager.AppSettings["StorageConnectionString"];
				CloudStorageAccount storageAccount = CloudStorageAccount.Parse(conn_str);

				CloudTableClient tableClient = storageAccount.CreateCloudTableClient();

				CloudTable table = tableClient.GetTableReference(table_name);
				return table;
			}
			catch (System.Configuration.ConfigurationErrorsException)		// table is not available while running as a website.
			{
				return null;
			}
			catch (ArgumentNullException)		// running unit test.
			{
				return null;
			}
		}
	}
}