
import argparse
import json
from pathlib import Path

import torch
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CHECKPOINT = ROOT_DIR / "checkpoints" / "best_model.pth"


class AnimalPredictor:

    def __init__(self, checkpoint_path=DEFAULT_CHECKPOINT):
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )

        checkpoint_path = Path(checkpoint_path)

        if not checkpoint_path.is_file():
            raise FileNotFoundError(
                f"Modele introuvable : {checkpoint_path}"
            )

        # Charger les poids et les métadonnées
        checkpoint = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True
        )

        class_to_idx = checkpoint["class_to_idx"]
        num_classes = checkpoint["num_classes"]

        if len(class_to_idx) != num_classes:
            raise ValueError("Nombre de classes incoherent")

        self.classes = [None] * num_classes

        for name, index in class_to_idx.items():
            self.classes[index] = name

        if any(name is None for name in self.classes):
            raise ValueError("Indices des classes invalides")

        # Créer ResNet18 sans télécharger de poids
        self.model = models.resnet18(weights=None)

        self.model.fc = torch.nn.Linear(
            self.model.fc.in_features,
            num_classes
        )

        # Charger les poids entraînés
        self.model.load_state_dict(
            checkpoint["model_state_dict"]
        )

        self.model = self.model.to(self.device)
        self.model.eval()

        # Identique aux transformations de validation
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def predict(self, image, top_k=3):
        """
        image : chemin, objet PIL.Image ou fichier binaire.
        Retourne les top_k espèces candidates.
        """

        if isinstance(image, (str, Path)):
            with Image.open(image) as img:
                image = img.convert("RGB")

        elif isinstance(image, Image.Image):
            image = image.convert("RGB")

        elif hasattr(image, "read"):
            with Image.open(image) as img:
                image = img.convert("RGB")

        else:
            raise TypeError("Format d'image non supporte")

        # Préparer le tenseur
        tensor = self.transform(image)
        tensor = tensor.unsqueeze(0).to(self.device)

        # Inférence sans calcul de gradients
        with torch.inference_mode():
            outputs = self.model(tensor)

            probabilities = torch.softmax(
                outputs,
                dim=1
            )[0]

            scores, indices = torch.topk(
                probabilities,
                k=min(max(1, top_k), len(self.classes))
            )

        predictions = []

        for score, index in zip(
            scores.cpu().tolist(),
            indices.cpu().tolist()
        ):
            predictions.append({
                "species": self.classes[index],
                "score": round(score, 4)
            })

        return {
            "predictions": predictions
        }


def main():
    parser = argparse.ArgumentParser(
        description="Reconnaissance d'especes animales"
    )

    parser.add_argument(
        "image",
        help="Chemin de la photographie"
    )

    parser.add_argument(
        "--top-k",
        type=int,
        default=3
    )

    args = parser.parse_args()

    if not Path(args.image).is_file():
        parser.error("La photographie n'existe pas")

    try:
        predictor = AnimalPredictor()

        result = predictor.predict(
            args.image,
            top_k=args.top_k
        )

        print(f"\nDevice : {predictor.device}")
        print(f"Image : {args.image}")
        print("\n=== RECONNAISSANCE ===")

        for rank, prediction in enumerate(
            result["predictions"], start=1
        ):
            print(
                f"{rank}. {prediction['species']} : "
                f"{prediction['score'] * 100:.2f}%"
            )

        print("\nJSON :")
        print(json.dumps(result, indent=2))

    except (OSError, ValueError, UnidentifiedImageError) as error:
        parser.exit(1, f"Erreur : {error}\n")


if __name__ == "__main__":
    main()
