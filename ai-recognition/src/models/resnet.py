import torch
import torch.nn as nn
from torchvision import models


def create_model(num_classes=5):

    # Charger ResNet18 préentraîné
    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )

    # Geler les couches existantes
    for param in model.parameters():
        param.requires_grad = False

    # Remplacer la dernière couche
    model.fc = nn.Linear(
        model.fc.in_features,
        num_classes
    )

    return model


if __name__ == "__main__":

    device = torch.device(
        "mps" if torch.backends.mps.is_available() else "cpu"
    )

    model = create_model()
    model = model.to(device)

    print("Device :", device)
    print("Dernière couche :", model.fc)

    # Test avec un batch fictif
    x = torch.randn(16, 3, 224, 224, device=device)

    model.eval()

    with torch.no_grad():
        output = model(x)

    print("Dimensions sortie :", output.shape)