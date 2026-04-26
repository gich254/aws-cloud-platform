const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const client = new SSMClient({});

exports.handler = async (event) => {
  console.log("Lambda triggered with event:", JSON.stringify(event));

  const command = new GetParameterCommand({
    Name: '/app/config/greeting',
    WithDecryption: false
  });

  try {
    const result = await client.send(command);
    const greeting = result.Parameter.Value;

    console.log("✅ Retrieved from SSM:", greeting);

    return {
      status: "Success",
      greeting: greeting
    };
  } catch (error) {
    console.error("❌ Error retrieving SSM parameter:", error);
    throw error;
  }
};
